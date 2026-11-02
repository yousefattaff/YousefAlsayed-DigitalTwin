---
title: EgyptianSavoryScout
slug: egyptian-savory-scout
type: project
order: 3
category: RESTAURANT FINDER
role: AI / Full-Stack Engineer
highlight: 1,000 places · TF-IDF · local model
summary: Describe a craving and a city. It ranks Egyptian restaurants, then a local model explains the pick.
status: active
featured: true
technologies:
  - Python
  - FastAPI
  - React
  - TF-IDF
  - Transformers
links:
  repository: https://github.com/yousefattaff/EgyptianSavoryScout
media:
  image: /projects/egyptian-savory-scout-ui.png
what_it_does: About 1,000 restaurants. A named city filters them first. Ranking is TF-IDF, then a local model writes the recommendation.
architecture:
  - "Drop places outside the named city."
  - "Rank the rest with TF-IDF. Similarity counts more than the rating."
  - "A local model explains the top five."
key_features:
  - "FastAPI serves the ranker. The page is React."
  - "No vector database and no sentence-transformer reranker."
---

City filter, TF-IDF ranking, then a local language model.
