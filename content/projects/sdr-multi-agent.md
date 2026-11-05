---
title: SDR Multi-Agent
slug: sdr-multi-agent
type: project
order: 2
category: B2B OUTBOUND SALES PIPELINE
role: AI Automation Engineer
highlight: 3 searches · 3 drafts · SendGrid
summary: Researches one company, writes three cold emails, picks one, and sends it.
status: active
featured: true
technologies:
  - Python
  - OpenAI Agents SDK
  - Groq
  - OpenRouter
  - Tavily
  - SendGrid
  - Langfuse
links:
  repository: https://github.com/yousefattaff/SDR_Multi_Agent
media:
  image: /projects/sdr-multi-agent.png
what_it_does: A company name goes in. A personal name stops the run before any research or email.
architecture:
  - "Three Tavily searches run together."
  - "Professional, witty, and concise drafts are written."
  - "A manager picks one. SendGrid sends it."
key_features:
  - "Groq runs most agents. OpenRouter runs the witty draft and the manager."
  - "A failed send is not reported as sent."
---

My SDR Multi-Agent is a B2B outbound sales pipeline that researches prospects, drafts personalized messages, and sends the selected email through SendGrid. It runs three parallel Tavily searches and produces professional, witty, and concise drafts before a manager selects one. A failed send is not reported as sent.
