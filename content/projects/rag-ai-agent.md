---
title: RAG-AI-Agent
slug: rag-ai-agent
type: project
order: 5
category: DOCUMENT QUESTION ANSWERING
role: AI / RAG Engineer
highlight: Chroma · page citations · Groq
summary: Upload PDFs, name an expert, and ask questions that cite the file and page.
status: active
featured: true
technologies:
  - Python
  - Streamlit
  - LangChain
  - ChromaDB
  - Groq
  - MiniLM
links:
  repository: https://github.com/yousefattaff/RAG-AI-Agent
media:
  image: /projects/rag-ai-agent-dr-insulino.jpg
what_it_does: Each expert is its own Chroma collection. If the files do not contain the answer, the app says so and skips the model.
architecture:
  - "Text pages are chunked and stored in Chroma."
  - "The question is searched with vectors and keywords, then reranked."
  - "Groq answers from those chunks and shows the page."
key_features:
  - "Llama 3.3 70B writes the answer. Llama 3.1 8B plans the search."
  - "PubMed and web search are not in this version."
---

Document question answering with local Chroma and page-level sources.
