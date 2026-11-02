---
title: Advanced Engineering Team
slug: advanced-engineering-team
type: project
order: 1
category: MULTI-AGENT AI SQUAD
role: Lead AI Engineer
highlight: 4 agents · Docker · Langfuse
summary: Four agents turn one software request into a design, Python, a Gradio demo, and tests.
status: active
featured: true
technologies:
  - Python
  - CrewAI
  - Groq
  - Llama 3.3
  - Qwen3
  - Llama 4 Scout
  - Docker
  - Gradio
  - Langfuse
links:
  repository: https://github.com/yousefattaff/advanced_engineering_team
media:
  image: /projects/advanced-engineering-team.png
what_it_does: A lead designs it, backend and frontend build it, and QA writes tests. A failed run is not retried.
architecture:
  - "Lead writes the design."
  - "Backend writes Python and can run it in Docker."
  - "Frontend builds the Gradio demo."
  - "QA writes tests and can run them in Docker."
key_features:
  - "Lead and QA use Llama 3.3 70B. Backend uses Qwen3 32B. Frontend uses Llama 4 Scout."
  - "Langfuse turns on only when both keys are set."
---

Four CrewAI agents on Groq. Docker can run the generated Python. The crew does not retry failures.
