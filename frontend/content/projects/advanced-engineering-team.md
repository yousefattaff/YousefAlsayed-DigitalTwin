---
title: Advanced Engineering Team
slug: advanced-engineering-team
type: project
order: 1
category: MULTI-AGENT AI SQUAD
role: Lead AI Engineer
highlight: 4 Autonomous Agents · Docker Sandboxed Execution · Langfuse Tracing
summary: An autonomous 4-agent software development squad powered by CrewAI and Groq. Give it any software specification, and the Engineering Lead architects the design, Backend and Frontend Engineers write modular code, and the QA Engineer executes unit tests in an isolated Docker container.
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
what_it_does: |
  Give this system a software requirement, and four CrewAI agents take it in order. The engineering lead writes the design. The backend engineer writes the Python module and can run it in Docker. The frontend engineer builds a Gradio demo. The QA engineer writes tests and can run them in Docker too.
architecture:
  - "Engineering lead: turns the requirement into a design."
  - "Backend engineer: writes the Python module and can execute it with the Docker tool."
  - "Frontend engineer: builds a Gradio app around that module."
  - "QA engineer: writes tests and can run them in Docker. The crew does not retry failures on its own."
key_features:
  - "Four agents on Groq. The lead and QA use Llama 3.3 70B, the backend uses Qwen3 32B, and the frontend uses Llama 4 Scout."
  - "Backend and QA run generated Python with a Docker tool. The container is removed when the run finishes."
  - "Langfuse tracing turns on only when both Langfuse keys are set."
  - "A run produces a design, Python code, a Gradio demo, and tests. It does not guarantee those tests pass."
---

Advanced Engineering Team is a sequential multi-agent workflow with engineering lead, backend, frontend, and QA roles. It uses separate model configurations, Docker-based code execution, stdin-driven requirements, and LangFuse observability to turn a software request into generated code and tests.
