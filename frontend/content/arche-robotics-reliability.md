---
title: Arche Robotics Testing, MCP Debugging, and Recovery Watchdogs
slug: arche-robotics-reliability
type: experience
order: 13
sources:
  - backend/data/linkedin.pdf
  - content/experience.md
---

# How did you test the robot monitoring system? (en)

At Arche Robotics, I built a local-to-cloud emulation harness using FastMCP servers over stdio, live AWS DynamoDB tables, and Slack webhooks. It supported testing and shipping fixes for nine production issues without requiring corporate network keys.

# What difficult bugs did you fix? (en)

I resolved a P0 MCP nested-payload parsing bug in the fleet-monitoring system. I also built a direct DynamoLogReader using GSI1 to reduce network latency. These are documented examples of debugging data handling and improving direct access to robot telemetry at Arche Robotics.

# How did you handle reliability and recovery? (en)

I added battery and telemetry recovery watchdogs with scheduling in each robot's timezone. The Arche Robotics work was validated with 265 automated Pytest unit tests and 13 live-stream smoke tests. Those counts describe the validation documented in my professional profile.

# اختبرت نظام مراقبة الروبوتات إزاي؟ (ar)

في Arche Robotics بنيت بيئة اختبار بين الجهاز المحلي والسحابة باستخدام FastMCP servers عبر stdio، وجداول AWS DynamoDB فعلية، و Slack webhooks. البيئة ساعدتني أختبر وأنشر إصلاحات لتسع مشاكل في الإنتاج من غير احتياج لمفاتيح شبكة الشركة.

# إيه أمثلة للمشاكل اللي حلّيتها؟ (ar)

حلّيت مشكلة P0 في تحليل MCP nested payloads في نظام مراقبة الأسطول. وبنيت DynamoLogReader مباشر باستخدام GSI1 لتقليل تأخير الشبكة. دي أمثلة موثّقة لشغلي في تتبع أخطاء البيانات والوصول المباشر لبيانات الروبوتات في Arche Robotics.

# اشتغلت على الاعتمادية والاستعادة إزاي؟ (ar)

أضفت watchdogs لاستعادة متابعة البطارية والـ telemetry، مع جدولة حسب المنطقة الزمنية لكل روبوت. التحقق الموثّق لشغل Arche Robotics شمل 265 اختبار Pytest و13 live-stream smoke tests.
