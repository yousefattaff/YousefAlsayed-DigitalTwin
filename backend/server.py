import base64
import hashlib
import json
import math
import os
import re
import threading
import unicodedata
import uuid
from time import monotonic
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.parse import unquote

import boto3
import chromadb
import httpx
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Path as PathParameter
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import APIConnectionError, APITimeoutError, AuthenticationError, Groq, PermissionDeniedError, RateLimitError
from pydantic import BaseModel, ConfigDict, Field, field_validator

load_dotenv(override=True)

app = FastAPI()
origins = os.getenv("CORS_ORIGINS", os.getenv("CORE_ORIGINS", "*")).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id"],
)

USE_S3 = os.getenv("USE_S3", "false").lower() == "true"
S3_BUCKET = os.getenv("S3_BUCKET", "")
BACKEND_DIR = Path(__file__).resolve().parent
GUARDRAILS = json.loads((BACKEND_DIR / "guardrails.json").read_text(encoding="utf-8"))
GUARDRAIL_INSTRUCTIONS = GUARDRAILS["single_pass_instructions"]
DECLINE_REPLIES = GUARDRAILS["decline_replies"]
_INPUT_PATTERNS = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in GUARDRAILS["input_patterns"]]
_OUTPUT_PATTERNS = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in GUARDRAILS["output_patterns"]]
_SCOPE = {key: re.compile(pattern, re.IGNORECASE) for key, pattern in GUARDRAILS["scope"].items()}


def _guard_normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    text = text.translate(str.maketrans({"і": "i", "а": "a", "е": "e", "с": "c", "о": "o", "р": "p", "х": "x", "у": "y"}))
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\u064b-\u065f\u0670]", "", text)
    text = re.sub("[أإآٱ]", "ا", text).replace("ى", "ي")
    return re.sub(r"[ \t]+", " ", text)


def _guard_decode(text: str) -> str:
    def character(match):
        code = int(next(value for value in match.groups() if value is not None), 10 if match.group(4) else 16)
        return chr(code) if code <= 0x10FFFF else match.group(0)
    text = re.sub(r"\\u([\da-f]{4})|\\x([\da-f]{2})|&#x([\da-f]{1,6});?|&#(\d{1,7});?", character, text, flags=re.IGNORECASE)
    return re.sub(r"(?:%[\da-f]{2})+", lambda match: unquote(match.group(0), errors="replace"), text, flags=re.IGNORECASE)


def _guard_variants(text: str) -> List[str]:
    values = [text]
    for _ in range(2):
        values.append(_guard_decode(values[-1]))
    for token in re.findall(r"[A-Za-z0-9+/_-]{24,}={0,2}", text)[:16]:
        if len(token) > 8000:
            continue
        try:
            values.append(base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode("utf-8", errors="replace"))
        except ValueError:
            pass
    normalized = [_guard_normalize(value) for value in values]
    return [variant for value in normalized for variant in (value, re.sub(r"\s+", " ", value))]


def _has_prompt_injection(text: str) -> bool:
    return any(pattern.search(value) for value in _guard_variants(text) for pattern in _INPUT_PATTERNS)


def _has_portfolio_scope(message: str, aliases=None, topic: Optional[str] = None) -> bool:
    aliases = aliases or []
    def words(text):
        value = " ".join(re.findall(r"[^\W_]+", _guard_normalize(text)))
        value = re.sub(r"\bhistroy\b", "history", value)
        return re.sub(r"\bhis\b", "your", re.sub(r"\bexper(?:ince|iance|infce)\b", "experience", value))
    def conversational_prefix(text):
        return re.sub(
            r"^(?:ok(?:ay)?|alright|well|so|then|sure|please)[,\s]+(?:then\s+)?",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()
    def scoped(clause, inherited):
        text = words(conversational_prefix(clause))
        if not text or _SCOPE["forbidden"].search(text):
            return False
        if any(_SCOPE[key].search(text) for key in ("greeting", "thanks", "wellbeing", "language")) or (inherited and _SCOPE["followup"].search(text)):
            return True
        if _SCOPE["identity"].search(text):
            return True
        if _SCOPE["brief_topic"].search(text):
            return True
        named = any(len(words(alias)) >= 4 and f" {words(alias)} " in f" {text} " for alias in aliases)
        subject = (
            _SCOPE["subject"].search(text)
            or _SCOPE["casual_subject"].search(text)
            or re.search(r"\b(?:age|older|younger|born|birthday)\b", text)
            or (inherited and _SCOPE["reference"].search(text))
        )
        return bool(named or (subject and (_SCOPE["topic"].search(text) or _SCOPE["casual_topic"].search(text) or text in {"who are you", "من انت"})))
    inherited = bool(topic and _has_portfolio_scope(topic, aliases))
    clauses = _clauses(message)
    if not clauses:
        return False
    for clause in clauses:
        if not scoped(clause, inherited):
            return False
        inherited = True
    return True


def _clauses(message: str) -> List[str]:
    return [clause.strip() for clause in re.split(
        r"[.!?؟;\n]+|\b(?:also|and then|and (?=what|how|when|where|why|which|who|do|did|can|could|tell|explain))\b|وايضا|وايضاً",
        message, flags=re.IGNORECASE,
    ) if clause.strip()]


def _is_forbidden_topic(message: str) -> bool:
    """A fallback wording hint, never a pre-inference gate."""
    for clause in _clauses(message):
        text = " ".join(re.findall(r"[^\W_]+", _guard_normalize(clause)))
        if text and _SCOPE["forbidden"].search(text):
            return True
    return False


def _guardrail_error(status: int = 403) -> HTTPException:
    return HTTPException(status_code=status, detail={
        "code": "guardrail",
        "error": DECLINE_REPLIES["en"],
        "error_ar": DECLINE_REPLIES["ar"],
    })


def _guard_input(*texts: str):
    if any(_has_prompt_injection(text) for text in texts):
        raise _guardrail_error()


def _guard_urls(text: str) -> set[str]:
    explicit = re.findall(r"(?:https?://|mailto:)[^\s<>\"'`\])]+", text, flags=re.IGNORECASE)
    markdown = re.findall(r"\[[^\]]*\]\(\s*([^\s)]+)[^)]*\)", text)
    contacts = re.findall(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:[a-z0-9-]+\.)+(?:com|me|org|net|io|dev|test)(?:/[^\s<>\"'`\])]+)?", text, flags=re.IGNORECASE)
    return {url.rstrip(".,;!?") for url in explicit + markdown + contacts}


def _safe_reply(text: str, reference: str) -> bool:
    values = _guard_variants(text)
    if any(pattern.search(value) for value in values for pattern in _OUTPUT_PATTERNS):
        return False
    secret = os.getenv("GROQ_API_KEY", "").strip()
    if secret and any(_guard_normalize(secret) in value for value in values):
        return False
    sentences = re.split(r"[.\n]", _guard_normalize(GUARDRAIL_INSTRUCTIONS))
    if any(len(sentence.strip()) >= 65 and any(sentence.strip() in value for value in values) for sentence in sentences):
        return False
    return _guard_urls(text).issubset(_guard_urls(reference))


NO_EVIDENCE_REPLY = "I don't have that detail in my portfolio yet. I can walk you through what I've documented, or you can reach me on LinkedIn for the specifics."


def _reply_language(question: str) -> str:
    if re.search(r"\b(?:in English|speak English|answer English)\b", question, re.IGNORECASE):
        return "en"
    return "ar" if re.search(r"[\u0600-\u06ff]|\b(?:in Arabic|speak Arabic|answer Arabic)\b", question, re.IGNORECASE) else "en"


def _no_evidence_reply(question: str) -> str:
    return "التفصيلة دي مش موثّقة عندي لسه. أقدر أحكيلك عن الموجود في مشاريعي، أو تكلمني على LinkedIn للتفاصيل." if _reply_language(question) == "ar" else NO_EVIDENCE_REPLY


def _decline_reply(question: str) -> str:
    return DECLINE_REPLIES["ar"] if _reply_language(question) == "ar" else DECLINE_REPLIES["en"]


def _social_reply(question: str) -> Optional[str]:
    text = " ".join(re.findall(r"[^\W_]+", _guard_normalize(question)))
    ar = _reply_language(question) == "ar"
    if _SCOPE["thanks"].search(text):
        return "العفو! سعيد إن الكلام فادك." if ar else "You're welcome! Glad I could help."
    if _SCOPE["wellbeing"].search(text):
        return "تمام، شكراً إنك سألت! أخبارك إيه؟" if ar else "I'm doing well, thanks for asking! How are you?"
    if _SCOPE["language"].search(text):
        return "أكيد، نتكلم بالعربي! تحب تعرف إيه عني أو عن شغلي؟" if ar else "Of course, we can chat in English! What would you like to know about me or my work?"
    if _SCOPE["greeting"].search(text):
        return "أهلاً! نورت، سعيد إنك هنا. تحب تعرف إيه عني أو عن شغلي؟" if ar else "Hey! Good to see you. What would you like to know about me or my work?"
    return None


def _portfolio_evidence(context: str) -> List[Dict[str, str]]:
    candidates = []
    remaining = 2800
    blocks = re.split(r"\[Source: ([^\]\n|]+) \| [^\]\n]*\]\n", context.replace("\r\n", "\n"))
    for index in range(1, len(blocks) - 1, 2):
        source = blocks[index].strip()
        if not re.fullmatch(r"[\w./-]+\.md", source):
            continue
        body = re.sub(r"^---\n[\s\S]*?\n---\n?", "", blocks[index + 1])
        for paragraph in re.split(r"\n\s*\n", body):
            quote = re.sub(r"^(?:(?:#{1,6} |\[Section: )[^\n]*\n)+", "", paragraph).strip()
            if not quote or len(quote) > 900 or re.search(r"```|^(?:#{1,6} |\[Section: |---$|(?:title|slug|type|order|image|image_url|repo_url):)", quote):
                continue
            if _has_prompt_injection(quote) or any(item["source"] == source and item["quote"] == quote for item in candidates):
                continue
            if len(quote) > remaining:
                continue
            candidates.append({"id": f"p{len(candidates)}", "source": source, "quote": quote})
            remaining -= len(quote)
            if len(candidates) == 5:
                return candidates
    return candidates


def _parse_portfolio_answer(content: str, candidates: List[Dict[str, str]]):
    selection = json.loads(content)
    if not isinstance(selection, dict) or set(selection) != {"decision", "passage_ids", "answer"}:
        raise ValueError("Invalid evidence selection")
    ids = selection["passage_ids"]
    if not isinstance(selection["answer"], str) or len(selection["answer"]) > 2500:
        raise ValueError("Invalid answer")
    if not isinstance(selection["decision"], str) or selection["decision"] not in {"answer", "insufficient_evidence"} or not isinstance(ids, list) or len(ids) > 5 or any(not isinstance(item, str) for item in ids) or len(set(ids)) != len(ids):
        raise ValueError("Invalid evidence selection")
    if selection["decision"] == "insufficient_evidence":
        if ids or len(selection["answer"]) > 600:
            raise ValueError("Invalid evidence selection")
        return [], selection["answer"].strip()
    if not ids or not selection["answer"].strip():
        raise ValueError("Missing evidence")
    by_id = {item["id"]: item for item in candidates}
    if any(item not in by_id for item in ids):
        raise ValueError("Unverified evidence")
    return [by_id[item] for item in ids], selection["answer"].strip()


def _answer_prose(answer: str) -> str:
    return re.sub(r"^```[\w+-]*[^\S\r\n]*\r?\n[\s\S]*?^```[^\S\r\n]*(?:\r?\n|$)", "", answer, flags=re.MULTILINE).strip()


def _illustrative_code(answer: str, question: str) -> bool:
    if "```" not in answer:
        return True
    prose = _answer_prose(answer)
    return "```" not in prose and bool(
        re.search(r"\b(?:code|script|python|example|snippet|implement)\b|كود|سكربت|مثال|بايثون", question, re.IGNORECASE)
        and re.search(r"\b(?:illustrative|example|simplified|sketch)\b|توضيحي|للتوضيح|مثال|مبس[ّط]", prose, re.IGNORECASE)
    )


def _supported_numbers(answer: str, evidence: List[Dict[str, str]]) -> bool:
    def digits(text):
        text = unicodedata.normalize("NFKC", text)
        text = "".join(str(unicodedata.digit(char)) if char.isdecimal() else char for char in text)
        text = re.sub(r"\bROS[ -]+([12])\b", r"ROS\1", text, flags=re.IGNORECASE)
        text = text.replace("٫", ".").replace("٬", ",").replace("٪", "%")
        return set(re.findall(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?%?", text))
    supported = set().union(*(digits(item["quote"]) for item in evidence))
    return digits(_answer_prose(answer)).issubset(supported)


def _conversational_reply(answer: str, question: str) -> bool:
    return bool(answer.strip()) and len(answer) <= 600 and "```" not in answer and (
        bool(re.search(r"[\u0600-\u06ff]", answer)) == (_reply_language(question) == "ar")
        and not _has_prompt_injection(answer) and _safe_reply(answer, "") and _supported_numbers(answer, [])
        and not re.search(r"\bi (?:have|hold|earned|won|studied|graduated|joined|built|developed|use|used)\b|\bmy (?:favou?rite|salary|degree|employer)\b|(?:انا (?:عندي|درست|اتخرجت|بستخدم)|بحب اكل|المفضل عندي|راتبي)", _guard_normalize(answer))
    )


def _supported_claims(answer: str, evidence: List[Dict[str, str]], question: str) -> bool:
    """Check concrete factual anchors, without a second model or prose vocabulary gate."""
    if not _illustrative_code(answer, question):
        return False
    prose = _answer_prose(answer)
    if bool(re.search(r"[\u0600-\u06ff]", prose)) != (_reply_language(question) == "ar") or _has_prompt_injection(prose):
        return False
    # Labeling requested illustrative code as non-original is not a career claim.
    # Other negations still require evidence; the full answer passes the shield.
    if "```" in answer:
        prose = re.sub(r"\bnot (?:my|the) (?:(?:original|actual|exact|production) )+(?:source )?(?:code|script|implementation)\b", "", prose, flags=re.IGNORECASE)
    reference = _guard_normalize("\n".join(item["quote"] for item in evidence))
    words = lambda text: re.findall(r"[^\W_]+", _guard_normalize(text))
    stem = lambda word: re.sub(r"(?:ing|ed|s)$", "", word) if len(word) > 3 else word
    supported = {term for word in words(reference) for term in (word, stem(word))}
    glue = set("i me my we our you your a an the and or of at in on to for from with as by is am are was were be been have has had do did can this that these those through into about also mainly use used using work worked working build built building develop developed developing focus focused include includes including yes sure absolutely happy glad thanks welcome great practical help helps helped part experience skills tools background portfolio project projects here example illustrative simplified snippet code since currently today now during after before alongside primarily specifically together their which where while both each within across so".split())
    aliases = {"ai": r"\b(?:ai|artificial intelligence)\b", "started": r"\b(?:since|started|joined)\b",
               "joined": r"\b(?:since|started|joined)\b", "remotely": r"\bremote(?:ly)?\b",
               "ran": r"\b(?:ran|runs?|running|integrated)\b"}
    anchors = set()
    for word in re.findall(r"\b(?:[A-Z][A-Za-z0-9]*|[a-z]+[A-Z][A-Za-z0-9]*)\b", prose):
        if word.lower() not in glue:
            anchors.update(words(word))
    for match in re.finditer(r"\b(?:use|used|using|know|proficient in|experience with|skilled in|worked at|studied at|graduated from)\s+([^.!?;:\n]{1,160})", prose, re.IGNORECASE):
        noun = re.split(r"\b(?:to|for|that|which|where|while|since|because|so|when|in|on|at|as)\b|[—–]", match[1], flags=re.IGNORECASE)[0]
        anchors.update(word for word in words(noun) if word not in glue)
    for word in re.findall(r"\b(?:phd|doctorate|doctoral|degree|bachelor|masters?|diploma|certificate|certification|professor|ceo|cto|founder|founded|invented|patented|led|managed|supervised|won|awarded|graduated|certified|fluent|available|salary|never|not|only|always|million|billion)\b|دكتوراه|ماجستير|بكالوريوس|راتب|متاح", prose, re.IGNORECASE):
        anchors.update(words(word))
    return all(word in supported or stem(word) in supported or word in glue
               or bool(aliases.get(word) and re.search(aliases[word], reference)) for word in anchors)


def _backend_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else BACKEND_DIR / path


DEFAULT_MEMORY_DIR = "/tmp/memory" if os.getenv("AWS_LAMBDA_FUNCTION_NAME") else str(BACKEND_DIR / ".memory")
MEMORY_DIR = str(_backend_path(os.getenv("MEMORY_DIR", DEFAULT_MEMORY_DIR)))
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
_content_candidates = [
    Path("/content"),
    BACKEND_DIR / "content",
    BACKEND_DIR.parent / "content",
]
DEFAULT_CONTENT_DIR = next((path for path in _content_candidates if path.exists()), _content_candidates[0])
CONTENT_DIR = _backend_path(os.getenv("CONTENT_DIR", str(DEFAULT_CONTENT_DIR)))
DEFAULT_CHROMA_DIR = "/tmp/chroma" if os.getenv("AWS_LAMBDA_FUNCTION_NAME") else str(
    BACKEND_DIR / ".chroma"
)
CHROMA_DIR = _backend_path(os.getenv("CHROMA_DIR", DEFAULT_CHROMA_DIR))
COLLECTION_NAME = "portfolio-content-v2"


def _int_setting(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return min(max(value, minimum), maximum)


def _float_setting(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        value = default
    if not math.isfinite(value):
        value = default
    return min(max(value, minimum), maximum)


TOP_K = _int_setting("RAG_TOP_K", 5, 1, 10)
RAG_MAX_DISTANCE = _float_setting("RAG_MAX_DISTANCE", 0.85, 0.0, 2.0)
MAX_CONTEXT_CHARS = _int_setting("RAG_MAX_CONTEXT_CHARS", 8000, 1000, 24000)
MAX_CHUNK_CHARS = 2000
CHUNK_OVERLAP_CHARS = 200
MAX_MESSAGE_CHARS = 2000
MAX_SESSION_ID_CHARS = 100
SESSION_ID_PATTERN = r"^[A-Za-z0-9_-]+$"
MAX_HISTORY_CHARS = 3000
MAX_HISTORY_MESSAGES = 6
MAX_RESPONSE_CHARS = 10000
MAX_COMPLETION_TOKENS = _int_setting("GROQ_MAX_COMPLETION_TOKENS", 1024, 64, 4096)
PROVIDER_TIMEOUT_SECONDS = _float_setting("GROQ_TIMEOUT_SECONDS", 25.0, 5.0, 60.0)
PROVIDER_MAX_RETRIES = _int_setting("GROQ_MAX_RETRIES", 0, 0, 2)
NO_CONTEXT_RESPONSE = (
    "I haven't covered that in my portfolio yet. You can reach me at "
    "yousefabuelkhear@gmail.com or on LinkedIn."
)

s3_client = boto3.client("s3") if USE_S3 else None
groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
    timeout=httpx.Timeout(PROVIDER_TIMEOUT_SECONDS, connect=5.0),
    max_retries=PROVIDER_MAX_RETRIES,
) if os.getenv("GROQ_API_KEY") else None

_index_lock = threading.RLock()
_memory_lock = threading.RLock()
_indexed_fingerprint: Optional[str] = None
_project_names: List[str] = []


class HashEmbeddingFunction:
    """Small offline embedding function, keeping Lambda/container startup predictable."""

    def __init__(self, dimensions: int = 256):
        self.dimensions = dimensions

    def _embed(self, input: List[str]) -> List[List[float]]:
        vectors = []
        for text in input:
            vector = [0.0] * self.dimensions
            for token in re.findall(r"\w+", text.lower()):
                digest = hashlib.sha256(token.encode("utf-8")).digest()
                vector[int.from_bytes(digest[:4], "big") % self.dimensions] += 1.0
            magnitude = sum(value * value for value in vector) ** 0.5 or 1.0
            vectors.append([value / magnitude for value in vector])
        return vectors

    def __call__(self, input: List[str]) -> List[List[float]]:
        return self._embed(input)

    def embed_documents(self, input: List[str]) -> List[List[float]]:
        return self._embed(input)

    def embed_query(self, input: List[str]) -> List[List[float]]:
        return self._embed(input)

    def name(self) -> str:
        return "hash-embedding"


def _split_markdown(path: Path, text: Optional[str] = None) -> Iterable[tuple[str, str, str]]:
    text = text if text is not None else path.read_text(encoding="utf-8")
    headings = list(re.finditer(r"(?m)^(#{1,6})\s+(.+?)\s*$", text))
    if not headings:
        yield path.name, text.strip(), path.name
        return
    for index, heading in enumerate(headings):
        start = heading.start()
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        section = heading.group(2).strip()
        chunk = text[start:end].strip()
        if chunk:
            yield section, chunk, path.name


def _bounded_chunks(text: str) -> Iterable[str]:
    start = 0
    while start < len(text):
        end = min(start + MAX_CHUNK_CHARS, len(text))
        if end < len(text):
            boundary = text.rfind("\n", start + MAX_CHUNK_CHARS // 2, end)
            if boundary < 0:
                boundary = text.rfind(" ", start + MAX_CHUNK_CHARS // 2, end)
            if boundary > start:
                end = boundary
        chunk = text[start:end].strip()
        if chunk:
            yield chunk
        if end == len(text):
            break
        start = max(end - CHUNK_OVERLAP_CHARS, start + 1)


def _content_snapshot():
    fingerprint = hashlib.sha256(f"bounded-content-v3:{MAX_CHUNK_CHARS}:{CHUNK_OVERLAP_CHARS}:hash256".encode())
    documents, ids, metadatas, project_names = [], [], [], []
    for path in sorted(CONTENT_DIR.rglob("*.md")):
        if path.name.lower() == "readme.md":
            continue
        relative = path.relative_to(CONTENT_DIR).as_posix()
        text = path.read_bytes()
        fingerprint.update(relative.encode("utf-8"))
        fingerprint.update(hashlib.sha256(text).digest())
        # Quarantine before chunking so injected headings cannot survive as metadata.
        if _has_prompt_injection(text.decode("utf-8")):
            continue
        category = relative.split("/", 1)[0] if "/" in relative else path.stem
        if category == "projects":
            project_names.append(" ".join(re.findall(r"\w+", path.stem.lower())))
        number = 0
        for section, chunk, _ in _split_markdown(path, text.decode("utf-8")):
            for bounded in _bounded_chunks(chunk):
                documents.append(bounded)
                ids.append(f"{relative}:{number}")
                metadatas.append({
                    "source": relative, "section": section, "chunk": number,
                    "category": category,
                })
                number += 1
    return fingerprint.hexdigest(), documents, ids, metadatas, project_names


def refresh_collection(target=None):
    global _indexed_fingerprint, _project_names
    target = target if target is not None else collection
    with _index_lock:
        if not CONTENT_DIR.is_dir():
            return
        fingerprint, documents, ids, metadatas, project_names = _content_snapshot()
        if fingerprint == _indexed_fingerprint and target.count() == len(ids):
            return
        existing_ids = set(target.get(include=[])["ids"])
        for offset in range(0, len(ids), 500):
            target.upsert(
                documents=documents[offset:offset + 500],
                ids=ids[offset:offset + 500],
                metadatas=metadatas[offset:offset + 500],
            )
        stale_ids = sorted(existing_ids.difference(ids))
        if stale_ids:
            target.delete(ids=stale_ids)
        _project_names = project_names
        _indexed_fingerprint = fingerprint


def build_collection():
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = client.get_or_create_collection(
        COLLECTION_NAME,
        embedding_function=HashEmbeddingFunction(),
        metadata={"hnsw:space": "cosine"},
    )
    refresh_collection(collection)
    return collection


collection = build_collection()


class ClientHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    role: str = Field(pattern=r"^(user|assistant)$")
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=MAX_SESSION_ID_CHARS, pattern=SESSION_ID_PATTERN)
    stream: bool = False
    # Kept for browser compatibility; stored history remains the conversation source.
    history: List[ClientHistoryEntry] = Field(default_factory=list, max_length=12)
    topic: Optional[str] = Field(default=None, min_length=1, max_length=300)

    @field_validator("message", "topic")
    @classmethod
    def valid_text(cls, value):
        if value is not None and (not value.strip() or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", value)):
            raise ValueError("Invalid chat text")
        return value.strip() if value is not None else value

    @field_validator("history")
    @classmethod
    def bounded_client_history(cls, value):
        if sum(len(item.content) for item in value) > 12000:
            raise ValueError("Conversation history is too long")
        return value


class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: List[Dict[str, object]] = Field(default_factory=list)
    answer_mode: str = GUARDRAILS["answer_mode"]
    evidence: List[Dict[str, str]] = Field(default_factory=list)
    reply_kind: str = "insufficient_evidence"
    grounding_verified: bool = False
    grounding_method: str = "deterministic"


def get_memory_path(session_id: str) -> str:
    return f"{session_id}.json"


def load_conversation(session_id: str) -> List[Dict]:
    if USE_S3 and s3_client:
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=get_memory_path(session_id))
            return json.loads(response["Body"].read().decode("utf-8"))
        except ClientError as error:
            if error.response["Error"]["Code"] == "NoSuchKey":
                return []
            raise
    file_path = Path(MEMORY_DIR) / get_memory_path(session_id)
    if file_path.exists():
        return json.loads(file_path.read_text(encoding="utf-8"))
    return []


def save_conversation(session_id: str, messages: List[Dict]):
    if USE_S3 and s3_client:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=get_memory_path(session_id),
            Body=json.dumps(messages, ensure_ascii=False),
            ContentType="application/json",
        )
        return
    file_path = Path(MEMORY_DIR) / get_memory_path(session_id)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = file_path.with_name(f".{file_path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_text(json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(file_path)
    finally:
        temporary.unlink(missing_ok=True)


_QUERY_STOP_WORDS = {
    "the", "and", "for", "what", "how", "why", "who", "are", "you", "your",
    "about", "tell", "does", "with", "can", "could", "would", "please", "have",
    "has", "did", "which", "that", "this", "them", "those", "these", "from",
    "explain", "more", "details", "primary", "main", "any", "give", "there",
    "where", "when", "work", "works", "doing", "using", "information",
}
_INTENT_CATEGORIES = {
    "identity": ["about", "profile"],
    "skills": ["expertise", "resume", "about", "experience"],
    "solutions": ["expertise", "about", "resume", "experience", "projects"],
    "projects": ["projects"],
    "experience": ["experience", "achievements", "resume", "about"],
    "education": ["certifications", "resume", "achievements", "about"],
}
_INTENT_TERMS = {
    "identity": "identity name headline background profile Yousef Alsayed",
    "skills": "skills specialties technologies tools Python FastAPI LLM cloud automation",
    "solutions": "AI-assisted development AI solutions automation workflows skills tools agents LLM Python FastMCP",
    "projects": "projects solutions AI LLM agents applications",
    "experience": "experience career employment roles engineering",
    "education": "certifications certificates courses education university degree",
}


def _query_terms(text: str) -> set[str]:
    terms = {
        term for term in re.findall(r"\w+", text.lower())
        if term not in _QUERY_STOP_WORDS
        and (len(term) > 2 or term in {"ai", "ml", "r2", "go"})
    }
    return terms | {term[:-1] for term in terms if len(term) > 4 and term.endswith("s")}


def _query_intent(message: str) -> Optional[str]:
    phrase = " ".join(re.findall(r"\w+", message.lower()))
    named_project = any(name and name in phrase for name in _project_names)
    short_project = any(
        name.split()[0] in {"r2", "sdr", "atmega32"}
        and name.split()[0] in phrase.split()
        for name in _project_names if name
    )
    if named_project or short_project:
        return "projects"
    if re.search(r"\b(certificates?|certifications?|certified|courses?|education|degrees?|university)\b", phrase):
        return "education"
    if re.search(r"\b(skills?|stack|specialties|expertise|technologies|technology|tools|languages)\b", phrase):
        return "skills"
    if re.search(r"\b(build|building|develop|developing|development|automate|automating|automation|workflows?|implement|design)\b", phrase):
        return "solutions"
    if re.search(r"\b(projects?|applications?)\b", phrase):
        return "projects"
    if re.search(r"\b(solutions?|agents?)\b", phrase):
        return "solutions"
    if re.search(r"\b(experience|career|employment|employers?|work history|worked|roles?|jobs?)\b", phrase):
        return "experience"
    if phrase in {"hi", "hello", "hey"} or re.search(
        r"\b(who are you|who is yousef|your name|what do you do|about yourself|introduce yourself|background|biography|your profile)\b",
        phrase,
    ):
        return "identity"
    return None


def _is_followup(message: str) -> bool:
    phrase = " ".join(re.findall(r"\w+", message.lower()))
    phrase = re.sub(r"^please ", "", phrase)
    phrase = re.sub(r"^(?:can|could|would|will) you(?: please)? ", "", phrase)
    phrase = re.sub(r" please$", "", phrase)
    return bool(
        re.fullmatch(r"(?:(?:tell me|explain|show me|say) )?(?:more|more details|elaborate|expand|continue|go on)(?: a bit| a little| more)?", phrase)
        or re.search(r"\b(it|that|this|them|those|these|there)\b", phrase)
        or (phrase.startswith("and ") and _query_intent(message) is None)
    )


def _bounded_history(history: Optional[List[Dict]]) -> List[Dict[str, str]]:
    if not isinstance(history, list):
        return []
    messages = []
    remaining = MAX_HISTORY_CHARS
    for item in reversed(history[-MAX_HISTORY_MESSAGES:]):
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            continue
        content = item.get("content")
        if not isinstance(content, str) or not content.strip() or remaining <= 0:
            continue
        content = content[:min(MAX_MESSAGE_CHARS, remaining)].strip()
        messages.append({"role": item["role"], "content": content})
        remaining -= len(content)
    return list(reversed(messages))


def _retrieval_topic(message: str, history: Optional[List[Dict]]) -> str:
    if _is_followup(message) and isinstance(history, list):
        for item in reversed(history):
            if not isinstance(item, dict) or item.get("role") != "user":
                continue
            topic = item.get("retrieval_topic")
            if isinstance(topic, str) and topic.strip():
                return topic.strip()[:MAX_MESSAGE_CHARS]
            content = item.get("content")
            if isinstance(content, str) and content.strip() and not _is_followup(content):
                return content.strip()[:MAX_MESSAGE_CHARS]
    return message.strip()[:MAX_MESSAGE_CHARS]


def _retrieval_query(message: str, history: Optional[List[Dict]]) -> str:
    topic = _retrieval_topic(message, history)
    return f"{topic}\n{message}" if topic != message.strip() else message


def retrieve(message: str, history: Optional[List[Dict]] = None) -> tuple[str, List[Dict[str, object]]]:
    with _index_lock:
        refresh_collection()
        count = collection.count()
        if not count or not CONTENT_DIR.is_dir():
            return "", []
        query = _retrieval_query(message, history)
        intent = _query_intent(message)
        if query != message and (not intent or re.search(r"\b(it|that|this|them|those|these)\b", message.lower())):
            intent = _query_intent(query) or intent
        if intent:
            query = f"{query}\n{_INTENT_TERMS[intent]}"
        terms = _query_terms(query)
        if not terms:
            return "", []
        kwargs = {}
        if intent:
            kwargs["where"] = {"category": {"$in": _INTENT_CATEGORIES[intent]}}
        result = collection.query(
            query_texts=[query], n_results=min(TOP_K * 4, count),
            include=["documents", "metadatas", "distances"], **kwargs,
        )
        documents = (result.get("documents") or [[]])[0] or []
        metadata = (result.get("metadatas") or [[]])[0] or []
        distances = (result.get("distances") or [[]])[0] or []

    accepted = []
    for document, item, distance in zip(documents, metadata, distances):
        if not isinstance(document, str) or not isinstance(item, dict):
            continue
        source, section = item.get("source"), item.get("section")
        if not isinstance(source, str) or not isinstance(section, str):
            continue
        if _has_prompt_injection(f"{source}\n{section}\n{document}"):
            continue
        source_terms = _query_terms(f"{source} {section}")
        document_terms = _query_terms(document)
        if not intent and not (
            terms.intersection(document_terms | source_terms)
            and (distance <= RAG_MAX_DISTANCE or terms.intersection(source_terms))
        ):
            continue
        if intent and item.get("category") not in _INTENT_CATEGORIES[intent]:
            continue
        priority = _INTENT_CATEGORIES[intent].index(item["category"]) if intent else 0
        score = distance - 0.1 * min(4, len(terms.intersection(source_terms)))
        accepted.append((priority, score, document, source, section))

    blocks, sources, seen = [], [], set()
    remaining = MAX_CONTEXT_CHARS
    for _, _, document, source, section in sorted(accepted)[:TOP_K]:
        prefix = f"[Source: {source} | Section: {section}]\n"
        room = remaining - len(prefix) - (2 if blocks else 0)
        if room < 100:
            break
        excerpt = document[:room]
        if len(excerpt) < len(document) and " " in excerpt:
            excerpt = excerpt.rsplit(" ", 1)[0]
        block = prefix + excerpt
        blocks.append(block)
        remaining -= len(block) + (2 if len(blocks) > 1 else 0)
        if (source, section) not in seen:
            sources.append({"source": source, "section": section})
            seen.add((source, section))
    return "\n\n".join(blocks), sources


def make_messages(message: str, context: str, history: Optional[List[Dict]] = None) -> List[Dict[str, str]]:
    _guard_input(message, context)
    bounded = _bounded_history(history)
    _guard_input(*(item["content"] for item in bounded))
    envelope = json.dumps({
        "evidence_candidates": _portfolio_evidence(context),
        "question": message,
        "requested_language": _reply_language(message),
    }, ensure_ascii=False)
    return [{"role": "system", "content": GUARDRAIL_INSTRUCTIONS}, {"role": "user", "content": envelope}]


@app.get("/")
async def root():
    return {"message": "AI Digital Twin API", "memory_enabled": True, "storage": "S3" if USE_S3 else "local"}


@app.get("/health")
async def health_check():
    def document_count():
        refresh_collection()
        return collection.count()
    return {
        "status": "healthy", "use_s3": USE_S3,
        "rag_documents": await run_in_threadpool(document_count),
        "llm_configured": bool(groq_client), "provider": "groq", "model": MODEL,
        "guardrail_policy": GUARDRAILS["version"],
        "answer_mode": GUARDRAILS["answer_mode"],
        "grounding_method": "deterministic",
    }


def _provider_error(error: Exception) -> HTTPException:
    if isinstance(error, RateLimitError):
        return HTTPException(status_code=429, detail="The AI service is busy. Please try again shortly.")
    if isinstance(error, APITimeoutError):
        return HTTPException(status_code=504, detail="The AI service timed out. Please try again.")
    if isinstance(error, (AuthenticationError, PermissionDeniedError)):
        return HTTPException(status_code=503, detail="The AI service is temporarily unavailable. Please try again later.")
    if isinstance(error, APIConnectionError):
        return HTTPException(status_code=502, detail="The AI service could not be reached. Please try again.")
    return HTTPException(status_code=502, detail="The AI service could not complete the request. Please try again.")


class DraftRejected(ValueError):
    """An unusable generation is a conversational fallback, not an HTTP outage."""


def _create_completion(messages: List[Dict[str, str]], stream: bool, timeout: Optional[float] = None):
    candidates = json.loads(messages[1]["content"])["evidence_candidates"]
    ids = [item["id"] for item in candidates]
    schema = {
        "type": "object", "additionalProperties": False,
        "properties": {
            "decision": {"type": "string", "enum": ["answer", "insufficient_evidence"]},
            "answer": {"type": "string", "maxLength": 2500},
            "passage_ids": {"type": "array", "maxItems": min(5, len(ids)),
                            "items": {"type": "string", **({"enum": ids} if ids else {})}},
        },
        "required": ["decision", "answer", "passage_ids"],
    }
    return groq_client.chat.completions.create(
        model=MODEL, messages=messages, temperature=0, stream=stream,
        response_format={"type": "json_schema", "json_schema": {"name": "portfolio_answer", "strict": True, "schema": schema}},
        reasoning_effort="low",
        max_completion_tokens=MAX_COMPLETION_TOKENS,
        timeout=timeout or PROVIDER_TIMEOUT_SECONDS,
    )


def _stream_text(chunk) -> str:
    choices = getattr(chunk, "choices", None)
    first = choices[0] if isinstance(choices, (list, tuple)) and choices else None
    delta = getattr(first, "delta", None)
    if getattr(delta, "tool_calls", None) or getattr(delta, "function_call", None):
        raise DraftRejected("Unexpected provider tool call")
    if getattr(first, "finish_reason", None) in {"length", "content_filter"}:
        raise DraftRejected("Incomplete generation")
    content = getattr(delta, "content", None)
    if content is not None and not isinstance(content, str):
        raise DraftRejected("Invalid content")
    return content or ""


def _consume_stream(completion) -> str:
    # Validate the entire answer before exposing any bytes, including split secrets.
    pieces = []
    size = 0
    try:
        for chunk in completion:
            text = _stream_text(chunk)
            size += len(text)
            if size > MAX_RESPONSE_CHARS:
                raise DraftRejected("Provider response exceeds its bound")
            pieces.append(text)
        return "".join(pieces)
    finally:
        _close_completion(completion)


def _close_completion(completion):
    close = getattr(completion, "close", None)
    if callable(close):
        try:
            close()
        except Exception:
            pass


@app.post("/chat")
async def chat(request: ChatRequest):
    _guard_input(request.message, request.topic or "", *(item.content for item in request.history))
    session_id = request.session_id or str(uuid.uuid4())
    history = await run_in_threadpool(load_conversation, session_id)
    for item in history if isinstance(history, list) else []:
        if isinstance(item, dict) and item.get("role") in {"user", "assistant"}:
            _guard_input(*(item[key] for key in ("content", "retrieval_topic") if isinstance(item.get(key), str)))
    retrieval_topic = _retrieval_topic(request.message, history)
    scoped = _has_portfolio_scope(
        request.message, _project_names, retrieval_topic if retrieval_topic != request.message else None,
    )
    social = _social_reply(request.message)
    if social:
        if request.stream:
            return StreamingResponse(iter([social]), media_type="text/plain", headers={"X-Session-Id": session_id})
        return ChatResponse(response=social, session_id=session_id, reply_kind="social")
    context, sources = await run_in_threadpool(retrieve, request.message, history)
    candidates = _portfolio_evidence(context)

    def fallback(answer=""):
        reply = answer if _conversational_reply(answer, request.message) else (
            _no_evidence_reply(request.message) if scoped else _decline_reply(request.message))
        if request.stream:
            return StreamingResponse(iter([reply]), media_type="text/plain", headers={"X-Session-Id": session_id})
        return ChatResponse(response=reply, session_id=session_id,
                            reply_kind="insufficient_evidence" if scoped else "declined")

    if not groq_client:
        if not candidates:
            return fallback()
        raise HTTPException(status_code=503, detail="The AI service is not configured. Please try again later.")
    messages = make_messages(request.message, context, history)
    deadline = monotonic() + PROVIDER_TIMEOUT_SECONDS
    try:
        completion = await run_in_threadpool(_create_completion, messages, request.stream)
        if request.stream:
            content = await run_in_threadpool(_consume_stream, completion)
        else:
            choices = getattr(completion, "choices", None)
            first = choices[0] if isinstance(choices, (list, tuple)) and choices else None
            provider_message = getattr(first, "message", None)
            if getattr(provider_message, "tool_calls", None) or getattr(provider_message, "function_call", None):
                raise DraftRejected("Unexpected provider tool call")
            if getattr(first, "finish_reason", None) in {"length", "content_filter"}:
                raise DraftRejected("Incomplete generation")
            content = getattr(provider_message, "content", None)
        if not isinstance(content, str) or not content.strip() or len(content) > MAX_RESPONSE_CHARS:
            raise DraftRejected("Empty provider response")
        if monotonic() >= deadline:
            raise HTTPException(status_code=504, detail="The AI service timed out. Please try again.")
        try:
            selected, answer = _parse_portfolio_answer(content, candidates)
        except (ValueError, TypeError):
            raise DraftRejected("Invalid evidence selection")
        if not selected:
            return fallback(answer)
        evidence = [{"source": item["source"], "quote": item["quote"]} for item in selected]
        for item in evidence:
            source_path = (CONTENT_DIR / item["source"]).resolve()
            if not source_path.is_relative_to(CONTENT_DIR.resolve()) or not source_path.is_file():
                raise DraftRejected("Missing source")
            if item["quote"] not in source_path.read_text(encoding="utf-8").replace("\r\n", "\n"):
                raise DraftRejected("Source mismatch")
        sources = [item for item in sources if item["source"] in {quote["source"] for quote in evidence}]
        if not _safe_reply(answer, "\n".join(item["quote"] for item in evidence)) or not _supported_numbers(answer, evidence) or not _supported_claims(answer, evidence, request.message):
            raise DraftRejected("Unsupported or unsafe output")
    except DraftRejected:
        return fallback()
    except HTTPException:
        raise
    except Exception as error:
        body = getattr(error, "body", None)
        detail = body.get("error", body) if isinstance(body, dict) else {}
        if getattr(error, "status_code", None) in {400, 422} and isinstance(detail, dict) and detail.get("code") == "json_validate_failed":
            return fallback()
        raise _provider_error(error) from error
    await run_in_threadpool(persist_exchange, session_id, request.message, answer, retrieval_topic)
    if request.stream:
        return StreamingResponse(iter([answer]), media_type="text/plain", headers={"X-Session-Id": session_id})
    return ChatResponse(response=answer, session_id=session_id, sources=sources, evidence=evidence,
        reply_kind="answer", grounding_verified=True)


def persist_exchange(session_id: str, question: str, answer: str, retrieval_topic: Optional[str] = None):
    with _memory_lock:
        conversation = load_conversation(session_id)
        topic = retrieval_topic or _retrieval_topic(question, conversation)
        timestamp = datetime.now(timezone.utc).isoformat()
        conversation.extend(
            [{"role": "user", "content": question, "timestamp": timestamp, "retrieval_topic": topic[:MAX_MESSAGE_CHARS]},
             {"role": "assistant", "content": answer, "timestamp": timestamp}]
        )
        save_conversation(session_id, conversation)


@app.get("/conversation/{session_id}")
async def get_conversation(session_id: str = PathParameter(
    min_length=1, max_length=MAX_SESSION_ID_CHARS, pattern=SESSION_ID_PATTERN,
)):
    try:
        return {"session_id": session_id, "messages": await run_in_threadpool(load_conversation, session_id)}
    except Exception as error:
        raise HTTPException(status_code=500, detail="Conversation history is temporarily unavailable.") from error


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
