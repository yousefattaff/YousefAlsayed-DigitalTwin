---
title: Frequently Asked Questions — Applied AI, Multi-Agents & Cloud Infrastructure
slug: qa-applied-ai-and-agents-stack
category: qa
type: verification
language: bilingual
---

# Frequently Asked Questions: Applied AI, Multi-Agents & Cloud Infrastructure

### How does Yousef build and optimize production AI agents? (en)
At Arche Robotics, Yousef designed real-time AI fleet-monitoring agents triggered by AWS DynamoDB Streams with 0.3s latency. He created a deterministic 6-stage cost-skip ladder to eliminate redundant LLM calls before hitting Groq LPUs, and developed FastMCP servers over stdio to emulate cloud data locally, verified with 265 automated Pytest unit tests.

### يوسف بيبني وكلاء الذكاء الاصطناعي ويطورهم إزاي للإنتاج؟ (ar)
في شركة Arche Robotics، صمم يوسف وكلاء AI لمراقبة أساطيل الروبوتات لحظيًا عبر DynamoDB Streams بزمن استجابة 0.3 ثانية. وابتكر نظام فلترة حتمي من 6 مراحل (Cost-skip ladder) لمنع الاستدعاءات غير الضرورية لنماذج LLM على معالجات Groq، وبنى خوادم FastMCP عبر stdio لمحاكاة السحابة محليًا واختبارها عبر 265 اختبار Pytest آلي.

### What containerization and backend tools does Yousef utilize? (en)
Yousef holds the Docker Foundations Professional Certificate and utilizes multi-stage Dockerfiles, Docker Compose, AWS Lambda, AWS SAM, FastAPI, Node.js/Next.js edge functions, and ChromaDB vector databases.

### إيه أدوات الـContainerization والـBackend اللي بيستخدمها يوسف؟ (ar)
يوسف معتمد بشهادة Docker Foundations الاحترافية، وبيستخدم ملفات Dockerfile متعددة المراحل و Docker Compose، وخدمات AWS Lambda و AWS SAM، وأطر العمل FastAPI و Next.js، وقواعد البيانات الشعاعية ChromaDB.
