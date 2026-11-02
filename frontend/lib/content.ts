import 'server-only';

import fs from 'node:fs';
import path from 'node:path';

export type Frontmatter = Record<string, unknown>;

export interface ContentDocument {
  slug: string;
  data: Frontmatter;
  body: string;
  sourcePath: string;
}

export interface CertificateMedia {
  id: string;
  title: string;
  src: string;
  previewSrc: string;
  type: 'pdf' | 'image';
  issuer: string;
  category: string;
  badgeCode: string;
  whatItIs: string;
  whatILearned: string;
  stack: string[];
  highlights: string[];
}

function inferCertificateMetadata(filename: string, index: number) {
  const base = filename.replace(/\.[^.]+$/, '');
  const clean = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const badgeCode = `#${String(index + 1).padStart(2, '0')}`;

  if (/CS50AI/i.test(base)) {
    return {
      title: 'CS50AI — Intro to Artificial Intelligence with Python',
      issuer: 'Harvard University · CS50',
      category: 'AI & SEARCH ALGORITHMS',
      badgeCode,
      whatItIs:
        'Harvard University’s rigorous project-based curriculum covering classical and modern AI in Python, from graph search and adversarial planning to Bayesian inference, optimization, and neural networks.',
      whatILearned:
        'Mastered how to formulate real-world problems as state-space search trees, constraint satisfaction problems, and probabilistic models—foundations I directly apply when designing deterministic fallbacks and path-planning logic for autonomous agents and robots.',
      stack: ['Python', 'A* & Minimax Search', 'Markov Models', 'Constraint Satisfaction', 'PyTorch / TensorFlow', 'NLP'],
      highlights: [
        'Built heuristic search, knowledge-base inference, and machine learning projects in Python.',
        'Connected classical search algorithms with modern LLM and agent reasoning workflows.',
      ],
    };
  }
  if (/CS50x/i.test(base)) {
    return {
      title: 'CS50x — Introduction to Computer Science',
      issuer: 'Harvard University · CS50',
      category: 'COMPUTER SCIENCE',
      badgeCode,
      whatItIs:
        'Harvard University’s foundational computer science course covering low-level memory management in C, data structures, algorithms, SQL databases, and full-stack web engineering.',
      whatILearned:
        'Developed a deep mental model of pointers, memory allocation, hash tables, and algorithmic complexity in C before moving up the stack to Python, SQL, and web APIs.',
      stack: ['C', 'Python', 'SQL', 'Data Structures', 'Algorithms', 'Memory Management', 'Flask / HTML / JS'],
      highlights: [
        'Implemented custom hash tables, tries, and memory-safe C programs from scratch.',
        'Bridged bare-metal C programming with high-level Python application architecture.',
      ],
    };
  }
  if (/Machine_Learning_Specialization/i.test(base)) {
    return {
      title: 'Machine Learning Specialization',
      issuer: 'Stanford Online & DeepLearning.AI · Coursera',
      category: 'MACHINE LEARNING',
      badgeCode,
      whatItIs:
        'Andrew Ng’s 3-course Stanford & DeepLearning.AI specialization covering supervised learning, neural networks, decision trees, unsupervised clustering, recommender systems, and reinforcement learning.',
      whatILearned:
        'Learned the mathematical mechanics of gradient descent, regularization, bias-variance tradeoffs, and vector similarity—skills that directly power my TF-IDF/SBERT recommender systems and QLoRA fine-tuning experiments.',
      stack: ['Python', 'NumPy', 'Scikit-Learn', 'TensorFlow', 'Neural Networks', 'XGBoost', 'Recommender Systems'],
      highlights: [
        'Trained regression, classification, neural network, and collaborative filtering models.',
        'Applied error analysis, feature engineering, and hyperparameter tuning workflows.',
      ],
    };
  }
  if (/AIEngineerAgenticTrack/i.test(base)) {
    return {
      title: 'AI Engineer Agentic Track: Complete Agent & MCP Course',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'MULTI-AGENT & MCP',
      badgeCode,
      whatItIs:
        'A 17-hour hands-on engineering program focused on building autonomous multi-agent systems and Model Context Protocol (MCP) tool servers across modern agent frameworks.',
      whatILearned:
        'Learned how to architect reliable multi-agent role handoffs, expose external tools and databases safely through MCP/FastMCP servers, and add guardrails so autonomous agents stay deterministic in production.',
      stack: ['OpenAI Agents SDK', 'CrewAI', 'LangGraph', 'MCP / FastMCP', 'Python', 'Tool Calling'],
      highlights: [
        'Built multi-agent workflows with structured outputs, memory, and custom MCP servers.',
        'Applied directly to my real-time fleet-monitoring agent and SDR Multi-Agent projects.',
      ],
    };
  }
  if (/AI_Engineer_Core_Track/i.test(base)) {
    return {
      title: 'AI Engineer Core Track: LLM Engineering, RAG, QLoRA & Agents',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'LLMS · RAG · QLORA',
      badgeCode,
      whatItIs:
        'A comprehensive 33.5-hour curriculum covering end-to-end LLM engineering: frontier APIs, open-source Hugging Face models, vector embeddings, RAG pipelines, and parameter-efficient fine-tuning with QLoRA.',
      whatILearned:
        'Learned how to benchmark open vs. closed models, build chunking and ChromaDB retrieval pipelines that eliminate hallucinations, and fine-tune quantized Qwen/LLaMA models using LoRA adapters.',
      stack: ['Python', 'Hugging Face', 'LangChain', 'ChromaDB', 'QLoRA / PEFT', 'PyTorch', 'OpenAI / Groq'],
      highlights: [
        'Built grounded RAG pipelines and fine-tuned local open-weight models with QLoRA.',
        'Formed the technical backbone for my RAG-AI-Agent and EgyptianSavoryScout projects.',
      ],
    };
  }
  if (/AI_Engineer_Production_Track/i.test(base)) {
    return {
      title: 'AI Engineer Production Track: Deploy LLMs & Agents at Scale',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'PRODUCTION AI OPS',
      badgeCode,
      whatItIs:
        'An 18.5-hour production engineering course on containerizing, deploying, monitoring, and scaling LLM applications and multi-agent services in the cloud.',
      whatILearned:
        'Learned how to take AI prototypes into production using FastAPI, Docker, AWS serverless infrastructure (Lambda, API Gateway, DynamoDB), and Langfuse observability for latency and token tracking.',
      stack: ['FastAPI', 'Docker', 'AWS Lambda', 'DynamoDB', 'Langfuse', 'CI/CD', 'Pydantic'],
      highlights: [
        'Deployed containerized and serverless AI services with end-to-end telemetry.',
        'Applied directly to serverless AWS Lambda & DynamoDB Streams monitoring pipelines.',
      ],
    };
  }
  if (/AI_Builder_Agents_Voice_Agents_n8n/i.test(base)) {
    return {
      title: 'AI Builder: Agents, Voice Agents & Automations in n8n',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'VOICE AGENTS & N8N',
      badgeCode,
      whatItIs:
        'A 14.5-hour practical course on orchestrating event-driven AI workflows, webhook automations, and real-time voice agents using n8n and LLM APIs.',
      whatILearned:
        'Learned how to connect webhooks, CRMs, Slack, vector stores, and voice APIs into resilient automated pipelines with error handling and retry logic.',
      stack: ['n8n', 'Voice Agents', 'Webhooks', 'REST APIs', 'OpenAI', 'Workflow Automation'],
      highlights: [
        'Designed multi-step webhook and agent automations with human-in-the-loop approvals.',
        'Combined low-code n8n orchestration with custom Python microservices.',
      ],
    };
  }
  if (/AI Coder_Complete_Claude_code/i.test(base)) {
    return {
      title: 'AI Coder: Complete Claude Code & Coding Agents',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'CODING AGENTS',
      badgeCode,
      whatItIs:
        'A 16.5-hour course dedicated to AI-assisted software engineering, autonomous coding agents, MCP developer tooling, and test-driven agentic workflows.',
      whatILearned:
        'Learned how to pair-program with CLI coding agents using structured specs, automated test harnesses, and repository context rules to ship verified production code faster.',
      stack: ['Claude Code', 'Coding Agents', 'MCP Tools', 'Pytest', 'Git Workflows', 'Spec-Driven Dev'],
      highlights: [
        'Adopted spec-first, test-verified workflows for rapid full-stack and AI development.',
        'Inspired the sandboxed QA architecture in my Advanced Engineering Team project.',
      ],
    };
  }
  if (/AI_Leader_Generative/i.test(base)) {
    return {
      title: 'AI Leader: Generative & Agentic AI for Leaders',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'GENAI STRATEGY',
      badgeCode,
      whatItIs:
        'A focused program on evaluating ROI, cost-latency tradeoffs, security guardrails, and architectural governance for enterprise Generative and Agentic AI systems.',
      whatILearned:
        'Learned how to scope AI initiatives around measurable business outcomes, control inference costs with tiered model routing, and design safe enterprise guardrails.',
      stack: ['AI System Design', 'Cost & Latency Optimization', 'Guardrails', 'Model Routing', 'AI Governance'],
      highlights: [
        'Applied cost-aware model routing (e.g. six-stage skip ladders) to cut unnecessary LLM calls.',
      ],
    };
  }
  if (/Docker_Foundations/i.test(base)) {
    return {
      title: 'Docker Foundations Professional Certificate',
      issuer: 'Docker & LinkedIn Learning',
      category: 'CONTAINERS & DEVOPS',
      badgeCode,
      whatItIs:
        'Official Docker professional certification covering containerization fundamentals, Dockerfile authoring, multi-container Docker Compose stacks, image registries, and container security.',
      whatILearned:
        'Mastered building reproducible, lightweight container images and isolated execution sandboxes—essential for packaging FastAPI services and safely running LLM-generated code.',
      stack: ['Docker', 'Dockerfile', 'Docker Compose', 'Container Isolation', 'Linux', 'CI/CD'],
      highlights: [
        'Used to sandbox untrusted code execution in the Advanced Engineering Team multi-agent squad.',
      ],
    };
  }
  if (/EF SET/i.test(base)) {
    return {
      title: 'EF SET English Certificate — CEFR C2 Proficient (71/100)',
      issuer: 'EF Standard English Test',
      category: 'C2 ENGLISH PROFICIENCY',
      badgeCode,
      whatItIs:
        'Standardized international English assessment certifying C2 Proficient level (71/100 overall: C2 Reading 74/100, C1 Listening 67/100).',
      whatILearned:
        'Demonstrates full professional fluency for collaborating with international engineering teams, writing clear technical documentation, and teaching programming in English.',
      stack: ['C2 Proficient English', 'Technical Documentation', 'International Collaboration', 'Live Instruction'],
      highlights: [
        'Applied daily while working remotely with Arche Robotics and teaching 30+ students in English at iSchool.',
      ],
    };
  }
  if (/Deloitte_NextStep/i.test(base)) {
    return {
      title: 'Deloitte NextStep Mentorship Program',
      issuer: 'Deloitte',
      category: 'CAREER MENTORSHIP',
      badgeCode,
      whatItIs:
        'Competitive professional mentorship program by Deloitte focused on consulting problem-solving, stakeholder communication, and technology delivery.',
      whatILearned:
        'Learned structured problem decomposition, executive communication, and how to translate complex technical architectures into clear business value.',
      stack: ['Structured Problem Solving', 'Technical Consulting', 'Stakeholder Communication', 'Agile Delivery'],
      highlights: [
        'Strengthened how I scope engineering requirements and present technical demos.',
      ],
    };
  }
  if (/TIA Portal/i.test(base)) {
    return {
      title: 'TIA Portal Programming (Siemens S7-1200 & S7-1500)',
      issuer: 'Siemens Industrial Automation',
      category: 'PLC & AUTOMATION',
      badgeCode,
      whatItIs:
        'Hands-on industrial automation training covering Siemens SIMATIC S7-1200 and S7-1500 PLCs, Ladder Logic, Function Block Diagrams, and HMI integration in TIA Portal.',
      whatILearned:
        'Learned deterministic scan-cycle control, industrial sensor/actuator interfacing, and fail-safe state machine design that carries over into my robotics and watchdog systems.',
      stack: ['Siemens TIA Portal', 'S7-1200 / S7-1500 PLC', 'Ladder Logic', 'Industrial Automation', 'State Machines'],
      highlights: [
        'Built deterministic control logic and fault-recovery routines for industrial hardware.',
      ],
    };
  }
  if (/IMT_Embdedded_systems/i.test(base)) {
    return {
      title: 'Embedded Systems Diploma',
      issuer: 'IMT School',
      category: 'EMBEDDED SYSTEMS & C',
      badgeCode,
      whatItIs:
        'Intensive embedded systems engineering diploma covering bare-metal C programming, AVR microcontrollers, interfacing protocols (UART, SPI, I2C), timers, ADC, and RTOS concepts.',
      whatILearned:
        'Learned how to read hardware datasheets, manipulate microcontroller registers directly, and design clean MCAL/HAL driver layers for sensors, motors, and displays.',
      stack: ['Embedded C', 'ATmega32 AVR', 'MCAL / HAL Architecture', 'UART / SPI / I2C', 'PWM & Timers', 'RTOS'],
      highlights: [
        'Directly showcased in my ATmega32 Drivers and Applications repository.',
      ],
    };
  }
  if (/CNC Programming/i.test(base)) {
    return {
      title: 'CNC Programming & Machining',
      issuer: 'Manufacturing & Mechatronics Training',
      category: 'CAD / CAM & CNC',
      badgeCode,
      whatItIs:
        'Practical mechanical manufacturing training in G-code programming, toolpath planning, and precision CNC machining.',
      whatILearned:
        'Gained hands-on understanding of physical tolerances, mechanical fabrication, and hardware-software integration for robotics enclosures and frames.',
      stack: ['G-Code', 'CNC Machining', 'CAD / CAM', 'Mechanical Fabrication', 'Mechatronics'],
      highlights: [
        'Supported mechanical fabrication and chassis integration for robotics projects.',
      ],
    };
  }
  if (/Proficient_AI_Engineer/i.test(base)) {
    return {
      title: 'Proficient AI Engineer',
      issuer: "Ed Donner's AI curriculum",
      category: 'AI PROGRAM',
      badgeCode,
      whatItIs:
        'Program completion certificate, dated November 1, 2026, for the full Proficient AI Engineer curriculum. The certificate names the AI Builder, AI Coder, AI Leadership, Core, Agentic, and MLOps tracks.',
      whatILearned:
        'The certificate records completion of that curriculum and deployment of an AI application.',
      stack: ['AI Builder', 'AI Coder', 'AI Leadership', 'LLM Engineering', 'Agents and MCP', 'MLOps'],
      highlights: [
        'Covers the same tracks as the individual Udemy certificates in this deck.',
      ],
    };
  }
  if (/AAV/i.test(base)) {
    return {
      title: 'Arab American Vehicles (AAV) Engineering Training',
      issuer: 'Arab American Vehicles',
      category: 'AUTOMOTIVE ENGINEERING',
      badgeCode,
      whatItIs:
        'On-site industrial engineering training at Arab American Vehicles covering assembly-line automation, quality control systems, and electro-mechanical diagnostics.',
      whatILearned:
        'Observed how high-reliability production lines operate at scale and how automated quality checks prevent downstream failures.',
      stack: ['Production Systems', 'Electro-Mechanical Diagnostics', 'Quality Assurance', 'Industrial Operations'],
      highlights: [
        'Grounded my engineering approach in real-world manufacturing reliability.',
      ],
    };
  }

  return {
    title: clean,
    issuer: 'Verified Certificate',
    category: 'CREDENTIAL',
    badgeCode,
    whatItIs: 'Verified professional engineering certificate and practical training credential.',
    whatILearned: 'Applied core engineering principles to practical AI, software, and mechatronics systems.',
    stack: ['AI Engineering', 'Software Development', 'Automation'],
    highlights: ['Verified completion and practical project application.'],
  };
}

const contentRoot = fs.existsSync(path.join(process.cwd(), 'content'))
  ? path.join(process.cwd(), 'content')
  : path.join(process.cwd(), '..', 'content');

function scalar(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(source: string): Frontmatter {
  const lines = source.split(/\r?\n/);
  const result: Frontmatter = {};
  let currentList: unknown[] | null = null;
  let currentObject: Record<string, unknown> | null = null;
  let currentListIndent = -1;
  let currentListParent: Record<string, unknown> | null = null;

  for (const [lineIndex, line] of lines.entries()) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const text = line.trim();

    if (text.startsWith('- ') && currentList) {
      const item = text.slice(2);
      if (/^[A-Za-z][\w-]*\s*:/.test(item)) {
        const [key, ...rest] = item.split(':');
        const object = { [key.trim()]: scalar(rest.join(':')) };
        currentList.push(object);
        currentObject = object;
      } else {
        currentList.push(scalar(item));
      }
      continue;
    }

    const separator = text.indexOf(':');
    if (separator < 0) continue;
    const key = text.slice(0, separator).trim();
    const rawValue = text.slice(separator + 1).trim();

    if (currentList && indent <= currentListIndent) {
      currentList = null;
      currentObject = currentListParent;
      currentListParent = null;
      currentListIndent = -1;
    }

    if (indent > 0 && currentObject && rawValue) {
      currentObject[key] = scalar(rawValue);
    } else if (!rawValue) {
      const nextIsList = lines[lineIndex + 1]?.trim().startsWith('- ');
      if (nextIsList) {
        currentList = [];
        currentListIndent = indent;
        if (indent > 0 && currentObject) {
          currentObject[key] = currentList;
          currentListParent = currentObject;
        } else {
          result[key] = currentList;
          currentListParent = null;
        }
        currentObject = null;
      } else {
        currentObject = {};
        result[key] = currentObject;
        currentList = null;
        currentListParent = null;
        currentListIndent = -1;
      }
    } else {
      result[key] = scalar(rawValue);
      currentList = null;
      currentObject = null;
      currentListParent = null;
      currentListIndent = -1;
    }
  }
  return result;
}

export function parseMarkdown(source: string, sourcePath = ''): ContentDocument {
  const match = source.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]?([\s\S]*)$/);
  const data = match ? parseFrontmatter(match[1]) : {};
  const body = (match ? match[2] : source).trim();
  const slug = String(data.slug || path.basename(sourcePath, '.md'));
  return { slug, data, body, sourcePath };
}

function readDocument(filePath: string): ContentDocument {
  return parseMarkdown(fs.readFileSync(filePath, 'utf8'), filePath);
}

function readDirectory(directory: string): ContentDocument[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => readDocument(path.join(directory, file)))
    .sort((a, b) => Number(a.data.order ?? 999) - Number(b.data.order ?? 999));
}

export function getAbout() {
  return readDocument(path.join(contentRoot, 'about.md'));
}

export function getProfile() {
  return readDocument(path.join(contentRoot, 'profile.md'));
}

export function getAchievements() {
  return readDocument(path.join(contentRoot, 'achievements.md'));
}

export function getResume(profile = getProfile()) {
  const resume = readDocument(path.join(contentRoot, 'resume.md'));
  return { ...resume, data: { ...profile.data, ...resume.data } };
}

export function getProjects() {
  return readDirectory(path.join(contentRoot, 'projects'));
}

export function getCertifications() {
  return readDirectory(path.join(contentRoot, 'certifications'));
}

export function getCertificateMedia(): CertificateMedia[] {
  const certificateRoot = path.join(process.cwd(), 'public', 'certificates');
  if (!fs.existsSync(certificateRoot)) return [];

  const aiFirst = [
    /Proficient_AI_Engineer/i,
    /Machine_Learning_Specialization/i,
    /AIEngineerAgenticTrack/i,
    /AI_Engineer_Core_Track/i,
    /AI_Engineer_Production_Track/i,
    /AI_Builder_Agents/i,
    /AI Coder_Complete/i,
    /AI_Leader_Generative/i,
    /CS50AI/i,
  ];

  const certificateRank = (filename: string) => {
    const aiIndex = aiFirst.findIndex((pattern) => pattern.test(filename));
    return aiIndex === -1 ? aiFirst.length : aiIndex;
  };

  return fs.readdirSync(certificateRoot)
    .filter((file) => /\.(pdf|png|jpe?g|webp)$/i.test(file))
    .sort((a, b) => certificateRank(a) - certificateRank(b) || a.localeCompare(b))
    .map((file, index) => {
      const isPdf = /\.pdf$/i.test(file);
      const base = file.replace(/\.[^.]+$/, '');
      const previewFile = `${base}.jpg`;
      const previewExists = isPdf && fs.existsSync(path.join(certificateRoot, 'previews', previewFile));
      const src = `/certificates/${encodeURIComponent(file)}`;
      const previewSrc = previewExists
        ? `/certificates/previews/${encodeURIComponent(previewFile)}`
        : src;
      const meta = inferCertificateMetadata(file, index);

      return {
        id: file,
        title: meta.title,
        src,
        previewSrc,
        type: isPdf ? 'pdf' as const : 'image' as const,
        issuer: meta.issuer,
        category: meta.category,
        badgeCode: meta.badgeCode,
        whatItIs: meta.whatItIs,
        whatILearned: meta.whatILearned,
        stack: meta.stack,
        highlights: meta.highlights,
      };
    });
}
