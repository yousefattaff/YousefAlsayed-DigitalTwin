---
title: RAG-AI-Agent
slug: rag-ai-agent
type: project
order: 5
category: DOCUMENT QUESTION ANSWERING
role: AI / RAG Engineer
highlight: Local Chroma · page sources · MiniLM and BM25
summary: A Streamlit app that turns uploaded text PDFs into a named expert. Questions are answered from that expert's Chroma collection, with the file and page shown beside the answer.
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
what_it_does: |
  You name an expert and upload text PDFs. Pages with no extractable text are skipped. Each chunk is stored with its filename and page in that expert's Chroma collection, using MiniLM embeddings. A question is planned, searched with vector MMR and BM25, reranked, padded with neighboring chunks, graded, and compressed. Groq then writes the answer. If retrieval is empty, the app says it could not find it in the documents and does not call the model.
architecture:
  - "Ingestion splits pages at 1,000 characters with 200 overlap and upserts chunks by content id."
  - "The ask path plans the query, fuses MMR with BM25, reranks with a cross-encoder, expands neighbors, grades the chunks, compresses them, then calls Llama 3.3 70B."
  - "Query planning and grading use Llama 3.1 8B Instant."
  - "PubMed, web search, and the calculator are not in this checkout. The screen stays on document question answering. EasyOCR is installed and is not used during ingestion."
key_features:
  - "Sources show the filename, page, excerpt, and rerank score."
  - "Edge TTS can read the answer aloud when the network is available."
  - "Experts built before the header and sequence-index change need to be rebuilt."
  - "GraphRAG, RAPTOR, and OCR are left out of the live path."
---

RAG-AI-Agent keeps one Chroma collection per expert and answers from retrieved PDF chunks. The tool-calling agent is not part of the current code.
