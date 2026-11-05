---
title: DealBreaker
slug: deal-breaker
type: project
order: 4
category: E-COMMERCE INTELLIGENCE
role: AI / Full-Stack Engineer
highlight: Price tracking · scrapers · RAG · Groq ensemble
summary: DealBreaker tracks e-commerce electronics prices in Egypt, predicts fair prices, and answers questions about deals with a RAG pipeline.
status: completed
featured: false
technologies:
  - Python
  - Playwright
  - FastAPI
  - React
  - Vite
  - ChromaDB
  - Scikit-learn
  - Groq
what_it_does: Scrapes live product listings from Noon, Jumia, and Amazon Egypt, builds a price history dataset, predicts whether a current price is a good deal, and explains findings through a retrieval-augmented chat.
architecture:
  - "Playwright scrapers collect live listings from Noon, Jumia, and Amazon.eg."
  - "A Random Forest model, trained on collected listings, predicts prices and flags deals."
  - "ChromaDB stores product data with MiniLM embeddings for retrieval-augmented answers."
  - "A Groq-powered LLM ensemble synthesizes deal verdicts for the user."
  - "FastAPI serves the backend; the interface is React with Vite."
key_features:
  - "Multi-retailer scraping with Playwright handles JavaScript-heavy storefronts."
  - "ML price prediction distinguishes genuine discounts from inflated list prices."
  - "RAG chat grounds deal explanations in the actual scraped product data."
---

DealBreaker is Yousef's capstone-style e-commerce intelligence tool. Playwright scrapers collect live electronics listings from Noon, Jumia, and Amazon Egypt. A Random Forest model trained on the collected data predicts prices and flags whether the current offer is a genuine deal. A RAG pipeline with ChromaDB and MiniLM embeddings, plus a Groq-powered LLM ensemble, explains the verdict in a chat interface built with FastAPI, React, and Vite.

# What problem does DealBreaker address? (en)

My DealBreaker project analyzes electronics offers in Egypt. It collects listings from Noon, Jumia, and Amazon Egypt, builds a price-history dataset, and uses a trained Random Forest model to estimate prices and flag potential deals.

# How do scraping, prediction, and chat fit together? (en)

Playwright scrapers collect data from the retailers' JavaScript-heavy storefronts. The price model works on the collected listings. ChromaDB with MiniLM embeddings retrieves product information, and a Groq-powered LLM ensemble explains the results through a FastAPI backend and a React/Vite interface.

# DealBreaker بيحل مشكلة إيه؟ (ar)

مشروع DealBreaker بيحلل عروض الإلكترونيات في مصر. بيجمع listings من Noon و Jumia و Amazon Egypt، وبيبني بيانات لتاريخ الأسعار. موديل Random Forest متدرّب على البيانات بيقدّر الأسعار وبيحدد العروض المحتملة.

# البحث والتوقع والشات مرتبطين إزاي؟ (ar)

Playwright بيجمع بيانات المتاجر اللي بتعتمد على JavaScript. موديل الأسعار بيشتغل على الـ listings المجموعة. ChromaDB مع MiniLM embeddings بيسترجع معلومات المنتجات، ومجموعة LLMs عبر Groq بتشرح النتائج من خلال FastAPI وواجهة React/Vite.
