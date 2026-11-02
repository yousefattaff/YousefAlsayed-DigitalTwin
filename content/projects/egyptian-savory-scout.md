---
title: EgyptianSavoryScout
slug: egyptian-savory-scout
type: project
order: 3
category: SEMANTIC RECOMMENDER SYSTEM
role: AI / Full-Stack Engineer
highlight: 1,000 restaurants · TF-IDF ranking · local model explanation
summary: An Egyptian restaurant finder. You describe a craving and a city, and it ranks the database, then a local model writes the recommendation.
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
what_it_does: |
  The app searches about 1,000 Egyptian restaurant entries. If the query names a supported city or area, restaurants outside that city are removed. The rest are ranked with TF-IDF and cosine similarity, with a small boost from the restaurant rating. Up to five of those results go to a fine-tuned local language model, which writes the recommendation. The page is a React app. If the API address is not set, the page uses an in-browser mock.
architecture:
  - "The React page sends the query to a FastAPI endpoint."
  - "The ranker drops restaurants outside a detected city, then scores the rest with TF-IDF. The score is 90 percent similarity and 10 percent rating."
  - "The top five candidates go to a local Transformers model loaded from a path on disk."
  - "The API parses the model output and returns the recommendation with a confidence level."
key_features:
  - "The database is about 1,000 restaurant entries across Egypt."
  - "Ranking is TF-IDF and cosine similarity. The project does not use ChromaDB or a sentence-transformer reranker."
  - "This is a V1. The training data and the recommendation setup are still being improved."
  - "The UI can run with a mock response when the backend URL is missing."
---

EgyptianSavoryScout filters by city, ranks restaurants with TF-IDF, and asks a local language model to explain the recommendation.
