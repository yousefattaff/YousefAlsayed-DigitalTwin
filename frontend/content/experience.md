---
title: Professional Experience and Industrial Training
slug: experience
type: experience
order: 3
---

# Arche Robotics — Artificial Intelligence Intern

Yousef Alsayed Abdelfattah has been an Artificial Intelligence Intern at Arche Robotics since July 2026. It is a remote role with Arche Robotics, which is based in Istanbul, Türkiye. He develops a real-time AI fleet-monitoring agent that reads live robot logs and helps identify anomalies.

He re-architected the Python, AWS Lambda, and AWS SAM fleet-monitor-agent from 30-minute polling intervals to real-time DynamoDB Stream triggers, with approximately 0.3-second capture. A six-stage skip ladder controls Groq LLM inference costs.

He built a local-to-cloud emulation harness using FastMCP servers over stdio, live DynamoDB tables, and Slack webhooks. This supported testing and shipping fixes for nine production issues without requiring corporate network keys. He resolved an MCP nested-payload parsing bug, implemented a direct DynamoLogReader using GSI1, and added battery and telemetry recovery watchdogs with scheduling in each robot's timezone.

The LinkedIn profile reports validation with 265 automated Pytest unit tests and 13 live-stream smoke tests.

# iSchool — English-Speaking Programming Instructor

Since May 2026, Yousef has worked as an English-speaking programming instructor at iSchool in Cairo, Egypt. He has taught over 30 students across Grades 1–12 in computer science and AI fundamentals.

He develops and delivers project-based curricula in Python, AI, JavaScript, and UI/UX design, using interactive lessons to explain programming concepts and develop problem-solving skills.

Yousef holds 17 iSchool instructor module certificates — internal training modules that qualify him to teach across grade bands and subject areas. The covered topics include Python instruction, UI/UX fundamentals, mobile and web development, data science, and game engines. This module training is what lets him teach the same core concepts at the right level whether a student is in Grade 1 or Grade 12.

# Egyptian Armed Forces Engineering Authority — IT Help Desk

From January 2025 to March 2026, Yousef completed compulsory national military service with the Egyptian Armed Forces Engineering Authority in Giza, Egypt. He provided on-site IT infrastructure, hardware, and technical troubleshooting support. His military service is complete.

# Outlier — AI Software Engineer and LLM Evaluation

From November 2024 to January 2025, Yousef worked as an AI Software Engineer at Outlier. He evaluated over 50 LLM responses daily across more than six domains and contributed reinforcement learning from human feedback (RLHF) to improve model accuracy.

He developed more than 20 prompt-engineering variations to identify hallucination and reasoning issues. He also reviewed over 50 analyst submissions and provided feedback to improve annotation consistency.

# Siemens — PLC Industrial Automation Training

In September 2023, Yousef trained with Siemens in Cairo, Egypt, programming S7-1200 and S7-1500 PLCs with TIA Portal. His training included ladder logic, basic structured logic, industrial control design, debugging, automation troubleshooting, factory workflows, and system integration.

# DMG MORI — CNC Programming and Operation Training

In September 2022, Yousef completed CNC turning and milling training with DMG MORI in Cairo, Egypt. Topics included G-code basics, machining logic, machine setup and operation, precision engineering, manufacturing workflows, and material processing.

# AOI Training Academy — Car Assembly and Maintenance Training

In September 2021, Yousef completed practical car assembly and maintenance training at AOI Training Academy in Cairo, Egypt. He gained exposure to vehicle assembly workflows, mechanical systems, maintenance and diagnostics, and teamwork in an industrial environment.

# Education — Mechatronics, Robotics, and Automation Engineering

Yousef studied for a bachelor's degree in Mechatronics, Robotics, and Automation Engineering at Misr University for Science and Technology (MUST) from September 2019 to June 2024. His background includes embedded C for microcontrollers and autonomous robots with ROS. In March 2023, he completed an IMT embedded systems diploma, and he put it to work building ATmega32 microcontroller drivers in Embedded C.

# Arche Robotics tools (en)

At Arche Robotics, I use Python, AWS Lambda, AWS SAM, and DynamoDB Streams for real-time robot fleet monitoring. Groq handles LLM inference, controlled by a six-stage skip ladder to manage costs. I use FastMCP with Model Context Protocol (MCP) over stdio for local-to-cloud testing, and a DynamoLogReader with GSI1 for direct telemetry access. Battery and telemetry watchdogs support recovery.

# Arche Robotics tools (ar)

في Arche Robotics، بستخدم Python وAWS Lambda وAWS SAM وDynamoDB Streams لمراقبة أسطول الروبوتات لحظيًا. Groq بيشغّل استدلال الـLLM، ومعاه نظام تخطي من ست مراحل للتحكم في التكلفة. وبستخدم FastMCP مع Model Context Protocol (MCP) عبر stdio للاختبار بين البيئة المحلية والسحابة، وDynamoLogReader مع GSI1 لقراءة بيانات الروبوتات مباشرة. كمان عندي watchdogs لمتابعة البطارية واستعادة بيانات الـtelemetry.

# DynamoDB Streams script (en)

Here is a simplified illustrative Python example of how I consume DynamoDB Stream records in an AWS Lambda handler at Arche Robotics to monitor robot telemetry:

```python
import json
import boto3

def lambda_handler(event, context):
    for record in event.get('Records', []):
        if record.get('eventName') in ('INSERT', 'MODIFY'):
            new_image = record.get('dynamodb', {}).get('NewImage', {})
            robot_id = new_image.get('robot_id', {}).get('S')
            battery = new_image.get('battery', {}).get('N')
            if robot_id and battery:
                process_telemetry(robot_id, float(battery))

def process_telemetry(robot_id, battery):
    print(f"Telemetry from robot {robot_id}: battery {battery}%")
```

This illustrative example is not my production source code, but shows the sub-second stream pattern.

# DynamoDB Streams script (ar)

ده مثال توضيحي ومبسط بلغة Python لكيفية معالجة أحداث DynamoDB Streams داخل AWS Lambda لمراقبة أسطول الروبوتات في Arche Robotics:

```python
import json
import boto3

def lambda_handler(event, context):
    for record in event.get('Records', []):
        if record.get('eventName') in ('INSERT', 'MODIFY'):
            new_image = record.get('dynamodb', {}).get('NewImage', {})
            robot_id = new_image.get('robot_id', {}).get('S')
            battery = new_image.get('battery', {}).get('N')
            if robot_id and battery:
                process_telemetry(robot_id, float(battery))

def process_telemetry(robot_id, battery):
    print(f"Telemetry from robot {robot_id}: battery {battery}%")
```

هذا الكود هو مثال توضيحي وليس الكود الإنتاجي الفعلي، ويوضح فقط نمط المعالجة اللحظية.
