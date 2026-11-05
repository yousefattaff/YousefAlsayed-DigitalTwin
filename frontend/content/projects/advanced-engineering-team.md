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

My Advanced Engineering Team is a 4-agent CrewAI squad: a lead handles design, a backend agent handles Python and Docker, a frontend agent builds a Gradio interface, and QA writes and runs tests. It turns one software request into a designed, tested, runnable application. The agents use Groq, and Docker can run the generated Python. The crew does not retry failures.

# Which agents and models are involved? (en)

The lead and QA agents use Llama 3.3 70B, the backend agent uses Qwen3 32B, and the frontend agent uses Llama 4 Scout. CrewAI coordinates their work through Groq. The project combines a design stage, Python implementation, a Gradio demo, and tests.

# What can run inside Docker? (en)

The backend agent can run its generated Python in Docker, and the QA agent can run tests in Docker. Langfuse tracing is optional and turns on when both required keys are configured. A failed crew run is not automatically retried.

# الـ agents والموديلات في المشروع إيه؟ (ar)

الـ lead والـ QA بيستخدموا Llama 3.3 70B، والـ backend بيستخدم Qwen3 32B، والـ frontend بيستخدم Llama 4 Scout. CrewAI بينسّق الشغل باستخدام Groq. المشروع بيجمع التصميم وكتابة Python و Gradio demo والاختبارات.

# إيه اللي ممكن يشتغل في Docker؟ (ar)

الـ backend agent يقدر يشغّل Python اللي كتبها داخل Docker، والـ QA يقدر يشغّل الاختبارات داخل Docker. تتبع Langfuse اختياري وبيشتغل عند إعداد المفتاحين المطلوبين. لو تشغيل الفريق فشل، مفيش إعادة محاولة تلقائية.
