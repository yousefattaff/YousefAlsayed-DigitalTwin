"""Exercise real local retrieval and API contracts without provider calls or live storage."""

import asyncio
import importlib.util
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import chromadb
import httpx
from chromadb.config import Settings
from fastapi.testclient import TestClient
from groq import APIConnectionError, APITimeoutError, AuthenticationError, RateLimitError


FIXTURES = {
    "about.md": "# Introduction\nYousef Alsayed is an AI Engineer and Mechatronics Graduate based in Cairo. He builds LLM applications and backend services.\n",
    "profile.md": "# Profile\nName: Yousef Alsayed Abdelfattah.\n",
    "expertise.md": "# Technical skills\nSpecialties include Python, FastAPI, AWS Lambda, DynamoDB Streams, FastMCP, ChromaDB, PyTorch, QLoRA, CrewAI, and LangGraph. AI-assisted development uses Claude Code and n8n workflow automation.\n",
    "resume.md": "# Skills\nPython, Docker, AWS, React, and mechatronics engineering.\n",
    "experience.md": "# Career history\nYousef joined Arche Robotics in July 2026, building DynamoDB Stream and Groq monitoring solutions.\n",
    "achievements.md": "# Achievements\nYousef holds verified certifications in AI-assisted development.\n",
    "projects/rag-ai-agent.md": "# Overview\nRAG-AI-Agent is a Python LLM application using ChromaDB, Groq, retrieval, and source citations.\n",
    "projects/sdr-multi-agent.md": "# Overview\nSDR Multi-Agent uses Python, the OpenAI Agents SDK, and Groq to coordinate sales research agents.\n",
    "certifications/claude-code.md": "# Certificate\nYousef earned an AI-assisted development certificate with Claude Code.\n",
}


def completion(text="A provider-generated answer."):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=text))])


def chunk(text):
    return SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=text))])


def provider_error(kind, marker="private-provider-marker"):
    request = httpx.Request("POST", "https://provider.invalid/chat")
    if kind is APITimeoutError:
        return kind(request=request)
    if kind is APIConnectionError:
        return kind(message=marker, request=request)
    status = 429 if kind is RateLimitError else 401
    return kind(marker, response=httpx.Response(status, request=request), body={"error": marker})


class FakeStream:
    def __init__(self, values, failure=None):
        self.values = values
        self.failure = failure
        self.closed = False

    def __iter__(self):
        yield from self.values
        if self.failure:
            raise self.failure

    def close(self):
        self.closed = True


class TwinTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix=".twin-tests-", dir=Path(__file__).resolve().parent)
        cls.base = Path(cls.temporary.name).resolve()
        assert cls.base.is_relative_to(Path(__file__).resolve().parent)
        cls.content = cls.base / "content"
        cls.memory = cls.base / "memory"
        cls.content.mkdir()
        backend = Path(__file__).resolve().parents[1]
        cls.client = chromadb.EphemeralClient(Settings(anonymized_telemetry=False))
        fake_provider = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=Mock())))
        environment = {
            "CONTENT_DIR": str(cls.content.relative_to(backend)), "CHROMA_DIR": str((cls.base / "unused-chroma").relative_to(backend)),
            "MEMORY_DIR": str(cls.memory.relative_to(backend)), "USE_S3": "false", "GROQ_API_KEY": "test-only-config",
            "RAG_TOP_K": "5", "RAG_MAX_CONTEXT_CHARS": "8000", "RAG_MAX_DISTANCE": "0.85",
            "GROQ_MAX_COMPLETION_TOKENS": "512", "GROQ_TIMEOUT_SECONDS": "25", "GROQ_MAX_RETRIES": "0",
        }
        spec = importlib.util.spec_from_file_location("isolated_twin_server", Path(__file__).resolve().parents[1] / "server.py")
        cls.server = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = cls.server
        with patch.dict(os.environ, environment), patch("dotenv.load_dotenv", return_value=False), \
             patch("chromadb.PersistentClient", return_value=cls.client), \
             patch("groq.Groq", return_value=fake_provider) as provider_factory:
            spec.loader.exec_module(cls.server)
            cls.provider_options = provider_factory.call_args.kwargs
            cls.initial_paths = (cls.server.CONTENT_DIR, cls.server.CHROMA_DIR, Path(cls.server.MEMORY_DIR))

    @classmethod
    def tearDownClass(cls):
        cls.client.delete_collection(cls.server.COLLECTION_NAME)
        cls.temporary.cleanup()
        sys.modules.pop("isolated_twin_server", None)

    def setUp(self):
        for path in self.content.rglob("*.md"):
            self.assertTrue(path.resolve().is_relative_to(self.base))
            path.unlink()
        if self.memory.exists():
            for path in self.memory.glob("*"):
                self.assertTrue(path.resolve().is_relative_to(self.base))
                if path.is_file():
                    path.unlink()
        for relative, text in FIXTURES.items():
            path = self.content / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        self.server.CONTENT_DIR = self.content
        self.server.MEMORY_DIR = str(self.memory)
        self.server.TOP_K = 5
        self.server.MAX_CONTEXT_CHARS = 8000
        self.server._indexed_fingerprint = None
        self.server.groq_client = None
        self.server.refresh_collection()

    def configured_provider(self, result=None, failure=None):
        create = Mock(return_value=result or completion(), side_effect=failure)
        self.server.groq_client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
        return create

    def test_relative_runtime_paths_are_anchored_to_backend_when_imported(self):
        self.assertEqual(self.initial_paths, (self.content, self.base / "unused-chroma", self.memory))

    def test_intro_is_grounded_in_about_and_profile(self):
        for message in ["Who are you?", "Tell me about yourself", "What is your name?", "hello"]:
            with self.subTest(message=message):
                context, sources = self.server.retrieve(message)
                self.assertIn("Yousef Alsayed", context)
                self.assertIn("about.md", {source["source"] for source in sources})
                self.assertTrue(all(source["source"] in {"about.md", "profile.md"} for source in sources))

    def test_skills_and_stack_include_current_specialties(self):
        for message in ["What are your primary technical skills?", "What is your technical stack?"]:
            with self.subTest(message=message):
                context, sources = self.server.retrieve(message)
                self.assertIn("FastMCP", context)
                self.assertIn("QLoRA", context)
                self.assertIn("expertise.md", {source["source"] for source in sources})

    def test_ai_projects_are_grounded_in_project_documents(self):
        context, sources = self.server.retrieve("Tell me about your AI projects")
        self.assertIn("RAG-AI-Agent", context)
        self.assertTrue(sources)
        self.assertTrue(all(source["source"].startswith("projects/") for source in sources))

    def test_solution_development_and_agent_tools_include_expertise(self):
        for message in ["How do you build AI solutions and automate workflows?", "What tools do you use to build AI agents?"]:
            with self.subTest(message=message):
                context, sources = self.server.retrieve(message)
                self.assertIn("Claude Code", context)
                self.assertIn("n8n", context)
                self.assertIn("expertise.md", {source["source"] for source in sources})

    def test_merged_portfolio_content_grounds_current_development_and_skills_prompts(self):
        self.server.CONTENT_DIR = Path(__file__).resolve().parents[2] / "content"
        for message in ["How do you build AI solutions and automate workflows?",
                        "What tools do you use to build AI agents?",
                        "What are your primary technical skills?"]:
            with self.subTest(message=message):
                context, sources = self.server.retrieve(message)
                self.assertIn("expertise.md", {source["source"] for source in sources})
                self.assertIn("Claude Code", context)
                self.assertIn("n8n", context)
                self.assertIn("FastMCP", context)

    def test_merged_content_distinguishes_rag_expertise_from_the_named_project(self):
        self.server.CONTENT_DIR = Path(__file__).resolve().parents[2] / "content"
        for message in ["Which tools do you use for RAG and fine-tuning?", "What are your RAG skills?"]:
            with self.subTest(message=message):
                context, sources = self.server.retrieve(message)
                self.assertIn("expertise.md", {source["source"] for source in sources})
                self.assertIn("LangChain", context)
                self.assertIn("QLoRA", context)
                self.assertTrue(all(not source["source"].startswith("projects/") for source in sources))
        context, sources = self.server.retrieve("Which tools does RAG-AI-Agent use?")
        self.assertIn("projects/rag-ai-agent.md", {source["source"] for source in sources})
        self.assertIn("ChromaDB", context)
        self.assertTrue(all(source["source"].startswith("projects/") for source in sources))

    def test_employer_history_is_grounded(self):
        context, sources = self.server.retrieve("What is your experience at Arche Robotics?")
        self.assertIn("July 2026", context)
        self.assertIn("DynamoDB Stream", context)
        self.assertIn("experience.md", {source["source"] for source in sources})

    def test_short_followup_reuses_the_supported_topic(self):
        history = [{"role": "user", "content": "Tell me about RAG-AI-Agent"},
                   {"role": "assistant", "content": "A previous provider answer."}]
        context, sources = self.server.retrieve("Which technologies does it use?", history)
        self.assertIn("ChromaDB", context)
        self.assertIn("projects/rag-ai-agent.md", {source["source"] for source in sources})
        messages = self.server.make_messages("Tell me more", context, history)
        self.assertEqual(messages[-1]["content"], "Tell me more")
        self.assertEqual(messages[1]["content"], history[0]["content"])
        self.assertIn("factual authority", messages[0]["content"])

    def test_polite_followups_continue_the_grounded_conversation(self):
        create = self.configured_provider()
        with TestClient(self.server.app) as client:
            self.assertEqual(client.post("/chat", json={"message": "Who are you?", "session_id": "polite"}).status_code, 200)
            for message in ["Can you elaborate?", "Could you please explain more?", "Please expand a bit."]:
                with self.subTest(message=message):
                    response = client.post("/chat", json={"message": message, "session_id": "polite"})
                    self.assertEqual(response.status_code, 200)
                    self.assertIn("about.md", {source["source"] for source in response.json()["sources"]})
                    self.assertEqual(create.call_args.kwargs["messages"][-1]["content"], message)

    def test_chained_followups_keep_topic_outside_bounded_provider_history(self):
        create = self.configured_provider()
        with TestClient(self.server.app) as client:
            for message in ["Who are you?", *["Tell me more"] * 5]:
                response = client.post("/chat", json={"message": message, "session_id": "chain"})
                self.assertEqual(response.status_code, 200)
                self.assertIn("about.md", {source["source"] for source in response.json()["sources"]})
        self.assertEqual(create.call_count, 6)
        provider_messages = create.call_args.kwargs["messages"]
        self.assertLessEqual(len(provider_messages), self.server.MAX_HISTORY_MESSAGES + 2)
        self.assertLessEqual(sum(len(item["content"]) for item in provider_messages[1:-1]), self.server.MAX_HISTORY_CHARS)
        self.assertTrue(all("retrieval_topic" not in message for message in provider_messages))
        users = [item for item in self.server.load_conversation("chain") if item["role"] == "user"]
        self.assertTrue(all(item["retrieval_topic"] == "Who are you?" for item in users))

    def test_legacy_history_resolves_followups_without_cached_topic_metadata(self):
        history = [{"role": "user", "content": "Who are you?"}, {"role": "assistant", "content": "A grounded identity answer."}]
        for _ in range(5):
            history.extend([{ "role": "user", "content": "Tell me more"}, {"role": "assistant", "content": "A grounded continuation."}])
        context, sources = self.server.retrieve("Can you elaborate?", history)
        self.assertIn("Yousef Alsayed", context)
        self.assertIn("about.md", {source["source"] for source in sources})

    def test_explicit_topic_switches_replace_the_cached_followup_topic(self):
        create = self.configured_provider()
        with TestClient(self.server.app) as client:
            for message in ["Tell me about RAG-AI-Agent", "And what certifications do you have?", "Tell me more"]:
                response = client.post("/chat", json={"message": message, "session_id": "topics"})
                self.assertEqual(response.status_code, 200)
            self.assertIn("certifications/claude-code.md", {source["source"] for source in response.json()["sources"]})
            self.assertTrue(all(not source["source"].startswith("projects/") for source in response.json()["sources"]))
            for message in ["And what are your primary technical skills?", "Could you please tell me more?"]:
                response = client.post("/chat", json={"message": message, "session_id": "topics"})
                self.assertEqual(response.status_code, 200)
            self.assertIn("expertise.md", {source["source"] for source in response.json()["sources"]})
            self.assertIn("FastMCP", create.call_args.kwargs["messages"][0]["content"])
            saved = client.get("/conversation/topics")
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["session_id"], "topics")
        self.assertEqual(len(saved.json()["messages"]), 10)
        self.assertEqual(saved.json()["messages"][-2]["retrieval_topic"], "And what are your primary technical skills?")

    def test_unsupported_subject_does_not_call_provider(self):
        create = self.configured_provider()
        self.assertEqual(self.server.retrieve("Explain quantum entanglement"), ("", []))
        with TestClient(self.server.app) as client:
            response = client.post("/chat", json={"message": "Explain quantum entanglement"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["sources"], [])
        self.assertEqual(response.json()["response"], self.server.NO_CONTEXT_RESPONSE)
        create.assert_not_called()

    def test_empty_collection_is_guarded_before_query(self):
        for path in self.content.rglob("*.md"):
            path.unlink()
        with patch.object(self.server.collection, "query", wraps=self.server.collection.query) as query:
            self.assertEqual(self.server.retrieve("Who are you?"), ("", []))
            query.assert_not_called()
        self.assertEqual(self.server.collection.count(), 0)

    def test_content_edits_new_files_and_removed_files_refresh_without_restart(self):
        about = self.content / "about.md"
        about.write_text(about.read_text(encoding="utf-8").replace("Cairo", "Alexandria"), encoding="utf-8")
        context, _ = self.server.retrieve("Who are you?")
        self.assertIn("Alexandria", context)
        self.assertNotIn("Cairo", context)
        added = self.content / "new-note.md"
        added.write_text("# Update\nNewlyIndexedTool is now documented in the portfolio.\n", encoding="utf-8")
        context, sources = self.server.retrieve("What is NewlyIndexedTool?")
        self.assertIn("NewlyIndexedTool", context)
        self.assertIn("new-note.md", {source["source"] for source in sources})
        (self.content / "projects/rag-ai-agent.md").unlink()
        _, sources = self.server.retrieve("Tell me about your AI projects")
        self.assertNotIn("projects/rag-ai-agent.md", {source["source"] for source in sources})
        self.assertFalse(self.server.collection.get(ids=["projects/rag-ai-agent.md:0"])["ids"])

    def test_missing_content_directory_does_not_delete_the_derived_index(self):
        original_count = self.server.collection.count()
        self.server.CONTENT_DIR = self.base / "unavailable-content"
        self.assertEqual(self.server.retrieve("Who are you?"), ("", []))
        self.assertEqual(self.server.collection.count(), original_count)

    def test_chunk_context_result_and_history_limits(self):
        (self.content / "expertise.md").write_text("# Technical skills\n" + "Python FastAPI and DynamoDB. " * 1000, encoding="utf-8")
        self.server.TOP_K = 2
        self.server.MAX_CONTEXT_CHARS = 1000
        context, sources = self.server.retrieve("What are your skills?")
        self.assertLessEqual(len(context), 1000)
        self.assertLessEqual(context.count("[Source:"), 2)
        self.assertLessEqual(len(sources), 2)
        documents = self.server.collection.get(include=["documents"])["documents"]
        self.assertTrue(all(len(document) <= self.server.MAX_CHUNK_CHARS for document in documents))
        history = [{"role": "user", "content": "x" * 5000} for _ in range(20)]
        messages = self.server.make_messages("Who are you?", context, history)
        self.assertLessEqual(sum(len(item["content"]) for item in messages[1:-1]), self.server.MAX_HISTORY_CHARS)
        self.assertLessEqual(len(messages), self.server.MAX_HISTORY_MESSAGES + 2)

    def test_provider_receives_grounded_context_bounded_tokens_and_history(self):
        create = self.configured_provider(completion("Yousef is an AI Engineer."))
        with TestClient(self.server.app) as client:
            first = client.post("/chat", json={"message": "Who are you?", "session_id": "followup"})
            second = client.post("/chat", json={"message": "Tell me more", "session_id": "followup"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["sources"])
        options = create.call_args.kwargs
        self.assertEqual(options["max_completion_tokens"], 512)
        self.assertFalse(options["stream"])
        self.assertIn("Yousef Alsayed", options["messages"][0]["content"])
        self.assertEqual(options["messages"][1]["content"], "Who are you?")
        self.assertEqual(options["messages"][-1]["content"], "Tell me more")
        self.assertEqual(len(self.server.load_conversation("followup")), 4)
        self.assertEqual(self.provider_options["max_retries"], 0)
        self.assertEqual(self.provider_options["timeout"].read, 25)

    def test_health_reports_missing_provider_and_chat_returns_503(self):
        with TestClient(self.server.app) as client:
            health = client.get("/health")
            response = client.post("/chat", json={"message": "Who are you?"})
        self.assertEqual(health.status_code, 200)
        self.assertFalse(health.json()["llm_configured"])
        self.assertGreater(health.json()["rag_documents"], 0)
        self.assertEqual(response.status_code, 503)

    def test_provider_failures_are_public_and_are_not_saved_as_answers(self):
        for kind, expected in [(RateLimitError, 429), (APITimeoutError, 504),
                               (AuthenticationError, 503), (APIConnectionError, 502), (RuntimeError, 502)]:
            with self.subTest(kind=kind.__name__):
                failure = RuntimeError("private-provider-marker") if kind is RuntimeError else provider_error(kind)
                self.configured_provider(failure=failure)
                with TestClient(self.server.app) as client:
                    response = client.post("/chat", json={"message": "Who are you?", "session_id": "failure"})
                self.assertEqual(response.status_code, expected)
                self.assertNotIn("private-provider-marker", response.text)
                self.assertEqual(self.server.load_conversation("failure"), [])

    def test_empty_provider_answer_is_a_failure(self):
        self.configured_provider(completion(""))
        with TestClient(self.server.app) as client:
            response = client.post("/chat", json={"message": "Who are you?"})
        self.assertEqual(response.status_code, 502)

    def test_stream_ignores_usage_chunks_and_saves_complete_answer(self):
        stream = FakeStream([SimpleNamespace(choices=[]), chunk("Yousef "), chunk("is an AI Engineer.")])
        self.configured_provider(stream)
        with TestClient(self.server.app) as client:
            response = client.post("/chat", json={"message": "Who are you?", "session_id": "stream", "stream": True})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Yousef is an AI Engineer.", response.text)
        self.assertIn("Sources:", response.text)
        self.assertEqual(response.headers["x-session-id"], "stream")
        self.assertEqual(self.server.load_conversation("stream")[-1]["content"], response.text)
        self.assertTrue(stream.closed)

    def test_stream_failures_are_safe_and_partial_answers_are_not_saved(self):
        for values, expected_status in [([], 502), ([chunk("Partial answer")], 200)]:
            with self.subTest(partial=bool(values)):
                stream = FakeStream(values, provider_error(APIConnectionError))
                self.configured_provider(stream)
                with TestClient(self.server.app) as client:
                    response = client.post("/chat", json={"message": "Who are you?", "session_id": "broken-stream", "stream": True})
                self.assertEqual(response.status_code, expected_status)
                self.assertNotIn("private-provider-marker", response.text)
                self.assertIn("could not be reached", response.text)
                self.assertEqual(self.server.load_conversation("broken-stream"), [])
                self.assertTrue(stream.closed)

    def test_input_limits_reject_oversized_messages_and_invalid_sessions(self):
        create = self.configured_provider()
        with TestClient(self.server.app) as client:
            for request in [{"message": "x" * 2001}, {"message": "Who are you?", "session_id": "../outside"}]:
                self.assertEqual(client.post("/chat", json=request).status_code, 422)
        create.assert_not_called()

    def test_conversation_route_validates_sessions_before_reading_storage(self):
        with patch.object(self.server, "load_conversation") as load_memory, TestClient(self.server.app) as client:
            for session in ["..%5Cfrontend%5Cpackage", "invalid.name", "x" * 101]:
                with self.subTest(session=session):
                    self.assertEqual(client.get(f"/conversation/{session}").status_code, 422)
            load_memory.assert_not_called()
            load_memory.return_value = []
            response = client.get("/conversation/valid-session_123")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"session_id": "valid-session_123", "messages": []})
        load_memory.assert_called_once_with("valid-session_123")

    def test_health_stays_responsive_during_blocking_provider_call(self):
        entered, release = threading.Event(), threading.Event()

        def blocked_provider(**kwargs):
            entered.set()
            release.wait(3)
            return completion()

        create = self.configured_provider()
        create.side_effect = blocked_provider

        async def exercise():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.server.app), base_url="http://test") as client:
                pending = asyncio.create_task(client.post("/chat", json={"message": "Who are you?"}))
                try:
                    self.assertTrue(await asyncio.to_thread(entered.wait, 1))
                    self.assertFalse(pending.done())
                    health = await asyncio.wait_for(client.get("/health"), timeout=1)
                    self.assertEqual(health.status_code, 200)
                finally:
                    release.set()
                self.assertEqual((await pending).status_code, 200)

        asyncio.run(exercise())


if __name__ == "__main__":
    unittest.main()
