---
title: RAG-AI-Agent
slug: rag-ai-agent
type: project
order: 5
category: ENTERPRISE DOCUMENT INTELLIGENCE
role: AI / RAG Engineer
highlight: ChromaDB Vector Store · Strict Page Citations · Tool Calling Mode
summary: A production document intelligence application that transforms uploaded PDFs into specialized conversational experts (e.g. Dr. Insulino) with strict page-level citations and tool-augmented agent capabilities.
status: active
featured: true
technologies:
  - Python
  - Streamlit
  - LangChain
  - ChromaDB
  - Groq LPU
  - PubMed API & Tavily
links:
  repository: https://github.com/yousefattaff/RAG-AI-Agent
media:
  image: /projects/rag-ai-agent-dr-insulino.jpg
what_it_does: |
  Transforms complex multi-page PDFs (such as clinical medical guides or technical documentation) into grounded conversational experts like 'Dr. Insulino'. The system chunks and embeds pages locally into ChromaDB, executes dense vector similarity retrieval, cites exact document names and page numbers for every factual claim, and can seamlessly invoke external tools like PubMed, Tavily web search, or calculators.
architecture:
  - "Document Ingestion: Chunks and embeds multi-page PDFs locally into ChromaDB using Hugging Face embeddings."
  - "Grounded Dense Retrieval: Fetches top-k relevant passages with similarity gating to prevent hallucinations."
  - "Citation Synthesis: Formats responses with strict inline source attribution: [Source: document.pdf | Page: X]."
  - "Agent Tool Mode: Dynamically invokes PubMed API, Tavily search, or calculators when document context alone is insufficient."
key_features:
  - "Zero-hallucination document-only mode with fallback transparency when facts are absent."
  - "Dual modes: fast single-turn document QA or full tool-augmented ReAct agent."
  - "Interactive Streamlit UI for creating and managing custom persona experts."
  - "High-throughput inference with Groq LPU and LangChain orchestration."
---

RAG-AI-Agent creates named experts from uploaded PDFs. It chunks and embeds source pages locally, retrieves grounded context for document-only answers, displays filename and page citations, and optionally enables PubMed, Tavily, calculator, and voice tools through an agent mode.
