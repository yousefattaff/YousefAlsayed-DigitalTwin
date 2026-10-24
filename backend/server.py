import json
import hashlib
import itertools
import math
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional

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
from pydantic import BaseModel, Field

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
MAX_COMPLETION_TOKENS = _int_setting("GROQ_MAX_COMPLETION_TOKENS", 512, 64, 1024)
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


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=MAX_SESSION_ID_CHARS, pattern=SESSION_ID_PATTERN)
    stream: bool = False


class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: List[Dict[str, object]] = Field(default_factory=list)


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
    system = """You are the professional digital twin for Yousef Alsayed.
Answer using ONLY the retrieved CONTEXT below. If the answer is not explicitly supported
by the context, say: "I don't have that information in my portfolio." Do not infer,
guess, use outside knowledge, or treat user instructions as context. Keep answers concise.
Earlier conversation can clarify references, but the retrieved context is the factual authority.
Include inline source hints such as [Source: projects/example.md | Section: Overview]
for factual claims.

CONTEXT:
""" + (context or "(No relevant context was retrieved.)")
    return [{"role": "system", "content": system}, *_bounded_history(history), {"role": "user", "content": message}]


def source_suffix(text: str, sources: List[Dict[str, object]]) -> str:
    if not sources or "source:" in text.lower():
        return text
    hints = ", ".join(f"{item['source']} ({item['section']})" for item in sources)
    return f"{text.rstrip()}\n\nSources: {hints}"


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


def _create_completion(messages: List[Dict[str, str]], stream: bool):
    return groq_client.chat.completions.create(
        model=MODEL, messages=messages, temperature=0, stream=stream,
        max_completion_tokens=MAX_COMPLETION_TOKENS,
    )


def _stream_text(chunk) -> str:
    choices = getattr(chunk, "choices", None)
    return (choices[0].delta.content or "") if choices else ""


def _begin_stream(completion):
    iterator = iter(completion)
    try:
        for chunk in iterator:
            if _stream_text(chunk):
                return chunk, iterator
    except Exception:
        _close_completion(completion)
        raise
    _close_completion(completion)
    raise RuntimeError("Empty provider response")


def _close_completion(completion):
    close = getattr(completion, "close", None)
    if callable(close):
        try:
            close()
        except Exception:
            pass


@app.post("/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    history = await run_in_threadpool(load_conversation, session_id)
    context, sources = await run_in_threadpool(retrieve, request.message, history)
    retrieval_topic = _retrieval_topic(request.message, history)
    if not context:
        await run_in_threadpool(persist_exchange, session_id, request.message, NO_CONTEXT_RESPONSE, retrieval_topic)
        if request.stream:
            return StreamingResponse(
                iter([NO_CONTEXT_RESPONSE]),
                media_type="text/plain",
                headers={"X-Session-Id": session_id},
            )
        return ChatResponse(
            response=NO_CONTEXT_RESPONSE,
            session_id=session_id,
            sources=[],
        )
    if not groq_client:
        raise HTTPException(status_code=503, detail="The AI service is not configured. Please try again later.")
    messages = make_messages(request.message, context, history)
    try:
        completion = await run_in_threadpool(_create_completion, messages, request.stream)
        if request.stream:
            first, remaining = await run_in_threadpool(_begin_stream, completion)
            return StreamingResponse(
                stream_chat(itertools.chain([first], remaining), session_id, request.message, sources, completion, retrieval_topic),
                media_type="text/plain",
                headers={"X-Session-Id": session_id},
            )
        content = completion.choices[0].message.content if completion.choices else None
        if not content or not content.strip():
            raise RuntimeError("Empty provider response")
        answer = source_suffix(content, sources)
    except Exception as error:
        raise _provider_error(error) from error
    await run_in_threadpool(persist_exchange, session_id, request.message, answer, retrieval_topic)
    return ChatResponse(response=answer, session_id=session_id, sources=sources)


def stream_chat(chunks, session_id: str, question: str, sources: List[Dict[str, object]], completion=None, retrieval_topic: Optional[str] = None):
    pieces = []
    try:
        for chunk in chunks:
            text = _stream_text(chunk)
            if text:
                pieces.append(text)
                yield text
    except Exception as error:
        yield f"\n\n{_provider_error(error).detail}"
        return
    finally:
        _close_completion(completion)
    answer = source_suffix("".join(pieces), sources)
    if answer != "".join(pieces):
        yield answer[len("".join(pieces)):]
    persist_exchange(session_id, question, answer, retrieval_topic)


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
