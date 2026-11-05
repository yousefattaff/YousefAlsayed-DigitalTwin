---
title: EgyptianSavoryScout
slug: egyptian-savory-scout
type: project
order: 3
category: RESTAURANT FINDER
role: AI / Full-Stack Engineer
highlight: 1,000 places · TF-IDF · fine-tuned Qwen2
summary: Describe a craving and a city. It ranks Egyptian restaurants, then a locally fine-tuned Qwen2 model explains the pick.
status: active
featured: true
technologies:
  - Python
  - FastAPI
  - React
  - TF-IDF
  - Transformers
  - Unsloth
  - Qwen2
  - Ollama
links:
  repository: https://github.com/yousefattaff/EgyptianSavoryScout
media:
  image: /projects/egyptian-savory-scout-ui.png
what_it_does: About 1,000 restaurants. A named city filters them first. Ranking is TF-IDF, then a locally fine-tuned Qwen2 model writes the recommendation.
architecture:
  - "Drop places outside the named city."
  - "Rank the rest with TF-IDF. Similarity counts more than the rating."
  - "A locally fine-tuned Qwen2 (1.5B) model explains the top five."
key_features:
  - "FastAPI serves the ranker. The page is React."
  - "The explainer model is Qwen2-1.5B fine-tuned with Unsloth and quantized to GGUF, running fully local in Ollama."
  - "No vector database and no sentence-transformer reranker."
---

My EgyptianSavoryScout is a localized restaurant finder covering 1,000+ Egyptian dining spots. Its LLM/RAG workflow filters by city, retrieves recommendations with TF-IDF ranking, and uses a locally fine-tuned language model to explain the results. The explainer is a Qwen2 1.5B model fine-tuned with Unsloth, exported to GGUF and served fully local through Ollama. It uses FastAPI and React, without a vector database or sentence-transformer reranker.

# How does the restaurant recommendation flow work? (en)

The user describes a craving and a city. EgyptianSavoryScout first filters out places outside the named city, then ranks the remaining restaurants with TF-IDF. Similarity has more weight than rating. A locally fine-tuned Qwen2 model explains the top five choices.

# What did I use for the local model and interface? (en)

The explainer is Qwen2 1.5B, fine-tuned with Unsloth, exported to GGUF, and served through Ollama. FastAPI serves the ranker, and React provides the interface. Restaurant retrieval uses TF-IDF without a vector database or a sentence-transformer reranker.

# ترشيح المطاعم بيشتغل إزاي؟ (ar)

المستخدم بيوصف الأكل اللي عايزه والمدينة. EgyptianSavoryScout بيستبعد الأماكن خارج المدينة المطلوبة، وبعدها بيرتّب المطاعم بـ TF-IDF. التشابه ليه وزن أكبر من التقييم، وموديل Qwen2 محلي عملت له fine-tuning بيشرح أفضل خمس اختيارات.

# استخدمت إيه للموديل المحلي والواجهة؟ (ar)

الموديل هو Qwen2 بحجم 1.5B، عملت له fine-tuning باستخدام Unsloth، واتصدّر لـ GGUF وبيشتغل من خلال Ollama. FastAPI بيقدّم الـ ranker، والواجهة React. الاسترجاع بيعتمد على TF-IDF من غير vector database أو sentence-transformer reranker.
