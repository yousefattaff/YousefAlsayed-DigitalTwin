---
title: SDR Multi-Agent
slug: sdr-multi-agent
type: project
order: 2
category: B2B OUTBOUND SALES PIPELINE
role: AI Automation Engineer
highlight: Tavily Deep Search · Multi-Draft Evaluation · SendGrid Dispatch
summary: An autonomous outbound sales pipeline that researches target companies, synthesizes executive dossiers, drafts personalized outreach emails across multiple angles, evaluates the best version, and queues delivery via SendGrid.
status: active
featured: true
technologies:
  - Python
  - OpenAI Agents SDK
  - Groq
  - Tavily Search
  - SendGrid
  - Langfuse
links:
  repository: https://github.com/yousefattaff/SDR_Multi_Agent
media:
  image: /projects/sdr-multi-agent.png
what_it_does: |
  Automates the entire B2B sales development lifecycle. Input any target company name, and the pipeline executes strict input guardrails, dispatches parallel Tavily search workers to extract company news, revenue metrics, and tech stacks, synthesizes a strategic dossier, generates multi-angle value proposition emails, scores drafts with an evaluator agent, and queues personalized HTML emails via SendGrid.
architecture:
  - "Input Guardrails: Validates prospect identity and flags malformed or toxic queries."
  - "Research Planner: Dispatches parallel search workers via Tavily API to gather blogs, funding, and tech stacks."
  - "Research Writer: Synthesizes an executive intelligence dossier with confidence scoring."
  - "Sales Manager Evaluator: Drafts 3 distinct value propositions, scores them for relevance, and selects the winner."
  - "SendGrid Queueing: Renders responsive HTML email and dispatches it via SendGrid with OpenTelemetry tracing."
key_features:
  - "Orchestrated with OpenAI Agents SDK using modular multi-agent role handoffs."
  - "Parallel Tavily search workers slash prospect research latency by over 60%."
  - "Evaluation agent acts as an editorial judge, preventing generic sales spam."
  - "End-to-end tracing and latency breakdowns monitored in Langfuse."
---

SDR Multi-Agent combines deep research, parallel web search, multiple drafting agents, guardrails, HTML email generation, and SendGrid delivery. Langfuse tracing and OpenTelemetry instrumentation make the complete pipeline observable.
