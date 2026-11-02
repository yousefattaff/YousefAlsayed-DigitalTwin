---
title: SDR Multi-Agent
slug: sdr-multi-agent
type: project
order: 2
category: B2B OUTBOUND SALES PIPELINE
role: AI Automation Engineer
highlight: 3 Tavily searches · 3 email styles · SendGrid delivery
summary: A sales-development pipeline that researches one prospect, writes three cold emails, picks one, and sends it through SendGrid.
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
what_it_does: |
  Give it a company, not a person's name. A guardrail stops the run if it sees a personal name, and it also stops if that check cannot be read. Three Tavily searches run at the same time. A writer turns the results into a company overview, pain points, and personalization hooks. A sales manager then gets a professional draft, a witty draft, and a concise draft, picks one, and hands that draft to an email agent. The email agent writes a subject, turns the body into HTML, and sends it with SendGrid.
architecture:
  - "Name guardrail: blocks a personal first or last name before any research or email. Company and product names are allowed."
  - "Research: a planner asks for three searches. Those searches run together through Tavily, then a writer builds the research summary."
  - "Drafts: professional, witty, and concise agents each return a subject and body. The sales manager selects one and quotes it."
  - "Send: the email agent writes the subject, converts the chosen body to HTML, and calls SendGrid. A failed send is not reported as sent."
key_features:
  - "Most agents run on Groq. The witty drafter and the sales manager run on OpenRouter."
  - "The default run uses a Stripe prospect and sends a real email to the address in the environment file."
  - "Langfuse must accept the keys at startup. The run flushes one trace before the process exits."
  - "A broken draft can be sent back to the manager. The pipeline does not claim a measured speedup."
---

SDR Multi-Agent researches a prospect with three parallel Tavily searches, drafts three cold emails, selects one, and sends it through SendGrid. Langfuse records the run.
