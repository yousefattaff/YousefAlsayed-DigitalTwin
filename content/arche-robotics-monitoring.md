---
title: Arche Robotics Fleet Monitoring and DynamoDB Streams
slug: arche-robotics-monitoring
type: experience
order: 12
sources:
  - backend/data/linkedin.pdf
  - frontend/public/resume.pdf
  - content/experience.md
---

# What do you build at Arche Robotics? (en)

At Arche Robotics, I work on a real-time AI fleet-monitoring agent that reads live robot logs and helps identify anomalies. I joined in July 2026 as an Artificial Intelligence Intern. The remote role combines Python engineering, AWS serverless infrastructure, robot telemetry, and LLM inference.

# How did DynamoDB Streams improve log capture? (en)

I changed the fleet-monitor-agent from 30-minute polling intervals to real-time DynamoDB Stream triggers, with approximately 0.3-second log capture. The system uses Python, AWS Lambda, and AWS SAM. This change makes new robot logs available to the monitoring workflow much sooner.

# How do you control Groq inference costs? (en)

I added a six-stage skip ladder to control Groq LLM inference costs. It filters the monitoring workflow so model inference runs when a robot log needs it. The public project record documents the six-stage mechanism without publishing a monetary savings figure.

# Which AI tools and technologies do you use at Arche Robotics? (en)

At Arche Robotics, I use Python, AWS Lambda, AWS SAM, and DynamoDB Streams for fleet monitoring. Groq handles LLM inference, while FastMCP uses Model Context Protocol (MCP) over stdio for local-to-cloud testing. A DynamoLogReader with GSI1 provides direct telemetry access, and battery and telemetry watchdogs support recovery.

# بتبني إيه في Arche Robotics؟ (ar)

في Arche Robotics بشتغل على AI fleet-monitoring agent بيقرأ سجلات الروبوتات لحظيًا وبيساعد في اكتشاف الحالات غير الطبيعية. انضمّيت في يوليو 2026 كمتدرب Artificial Intelligence. الدور عن بُعد وبيجمع Python و AWS serverless وبيانات الروبوتات واستدلال LLMs.

# DynamoDB Streams حسّنت مراقبة الروبوتات إزاي؟ (ar)

حوّلت fleet-monitor-agent من polling كل 30 دقيقة لـ DynamoDB Stream triggers، بزمن التقاط للسجلات حوالي 0.3 ثانية. النظام بيستخدم Python و AWS Lambda و AWS SAM، وده خلّى السجلات الجديدة توصل لعملية المراقبة أسرع.

# بتتحكم في تكلفة Groq إزاي؟ (ar)

أضفت skip ladder من ست مراحل للتحكم في تكلفة استدلال Groq. المراحل دي بتفلتر عملية المراقبة عشان الموديل يشتغل لما سجل الروبوت يحتاجه. وصف الشغل العام بيوثق الآلية من غير رقم مالي منشور للتوفير.

# بتستخدم أدوات وتقنيات إيه في شغلك في Arche Robotics؟ (ar)

في Arche Robotics بستخدم Python و AWS Lambda و AWS SAM و DynamoDB Streams لمراقبة الأسطول. Groq بيشغّل استدلال LLMs، وبستخدم FastMCP مع Model Context Protocol (MCP) عبر stdio للاختبار بين الجهاز المحلي والسحابة. DynamoLogReader مع GSI1 بيوفر وصول مباشر للـ telemetry، و watchdogs بتدعم استعادة متابعة البطارية والبيانات.
