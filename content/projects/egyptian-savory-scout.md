---
title: EgyptianSavoryScout
slug: egyptian-savory-scout
type: project
order: 3
category: SEMANTIC RECOMMENDER SYSTEM
role: AI / Full-Stack Engineer
highlight: 1,000+ Locations · TF-IDF + SBERT Reranking · Natural Language Explanations
summary: An AI-powered dining discovery engine that indexes 1,000+ authentic Egyptian restaurants across Cairo and the Nile Valley, matching natural-language cravings to verified menus with dual-stage lexical and dense semantic ranking.
status: active
featured: true
technologies:
  - Python
  - FastAPI
  - React
  - TF-IDF
  - ChromaDB / SBERT
  - Hugging Face
links:
  repository: https://github.com/yousefattaff/EgyptianSavoryScout
media:
  image: /projects/egyptian-savory-scout-ui.png
what_it_does: |
  Finding authentic Egyptian dining shouldn't require guessing exact keywords. Type any natural craving like 'spicy grilled meat and authentic tagines with Nile view', and this system applies hard regional filtering across Cairo & Nile Valley cities, computes TF-IDF lexical relevance, reranks candidates with Sentence-BERT (SBERT), and generates natural-language explanations of why each restaurant fits your craving.
architecture:
  - "Query Parsing: Extracts dining intent, desired ambiance, and regional constraints (Cairo, Giza, Alexandria)."
  - "Hard City Filtering: Restricts candidates to geographically relevant verified listings."
  - "Two-Stage Retrieval: Combines sub-50ms TF-IDF lexical ranking with dense Sentence-BERT semantic similarity."
  - "LLM Explanation Engine: Generates personalized tasting notes and signature dish recommendations for top matches."
key_features:
  - "Curated dataset indexing 1,000+ authentic Egyptian restaurants and local street gourmet gems."
  - "Dual-stage retrieval balances sub-50ms latency with high semantic precision."
  - "Interactive React UI with real-time match scores and tag filtering."
  - "FastAPI backend with structured Pydantic response contracts."
---

EgyptianSavoryScout applies hard city filtering and TF-IDF ranking before asking a local language model to explain the recommendation. The project includes a FastAPI endpoint, a React interface, a structured restaurant dataset, and a clear recommendation response contract.
