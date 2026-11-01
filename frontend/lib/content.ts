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
    };
  }
  if (/CS50x/i.test(base)) {
    return {
      title: 'CS50x — Introduction to Computer Science',
      issuer: 'Harvard University · CS50',
      category: 'COMPUTER SCIENCE',
      badgeCode,
    };
  }
  if (/Machine_Learning_Specialization/i.test(base)) {
    return {
      title: 'Machine Learning Specialization',
      issuer: 'Stanford Online & DeepLearning.AI · Coursera',
      category: 'MACHINE LEARNING',
      badgeCode,
    };
  }
  if (/AIEngineerAgenticTrack/i.test(base)) {
    return {
      title: 'AI Engineer Agentic Track: Complete Agent & MCP Course',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'MULTI-AGENT & MCP',
      badgeCode,
    };
  }
  if (/AI_Engineer_Core_Track/i.test(base)) {
    return {
      title: 'AI Engineer Core Track: LLM Engineering, RAG, QLoRA & Agents',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'LLMS · RAG · QLORA',
      badgeCode,
    };
  }
  if (/AI_Engineer_Production_Track/i.test(base)) {
    return {
      title: 'AI Engineer Production Track: Deploy LLMs & Agents at Scale',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'PRODUCTION AI OPS',
      badgeCode,
    };
  }
  if (/AI_Builder_Agents_Voice_Agents_n8n/i.test(base)) {
    return {
      title: 'AI Builder: Agents, Voice Agents & Automations in n8n',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'VOICE AGENTS & N8N',
      badgeCode,
    };
  }
  if (/AI Coder_Complete_Claude_code/i.test(base)) {
    return {
      title: 'AI Coder: Complete Claude Code & Coding Agents',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'CODING AGENTS',
      badgeCode,
    };
  }
  if (/AI_Leader_Generative/i.test(base)) {
    return {
      title: 'AI Leader: Generative & Agentic AI for Leaders',
      issuer: 'Udemy · Ed Donner & Ligency',
      category: 'GENAI STRATEGY',
      badgeCode,
    };
  }
  if (/Docker_Foundations/i.test(base)) {
    return {
      title: 'Docker Foundations Professional Certificate',
      issuer: 'Docker & LinkedIn Learning',
      category: 'CONTAINERS & DEVOPS',
      badgeCode,
    };
  }
  if (/EF SET/i.test(base)) {
    return {
      title: 'EF SET English Certificate — CEFR C2 Proficient (71/100)',
      issuer: 'EF Standard English Test',
      category: 'C2 ENGLISH PROFICIENCY',
      badgeCode,
    };
  }
  if (/Deloitte_NextStep/i.test(base)) {
    return {
      title: 'Deloitte NextStep Mentorship Program',
      issuer: 'Deloitte',
      category: 'CAREER MENTORSHIP',
      badgeCode,
    };
  }
  if (/TIA Portal/i.test(base)) {
    return {
      title: 'TIA Portal Programming (Siemens S7-1200 & S7-1500)',
      issuer: 'Siemens Industrial Automation',
      category: 'PLC & AUTOMATION',
      badgeCode,
    };
  }
  if (/IMT_Embdedded_systems/i.test(base)) {
    return {
      title: 'Embedded Systems Diploma',
      issuer: 'IMT School',
      category: 'EMBEDDED SYSTEMS & C',
      badgeCode,
    };
  }
  if (/CNC Programming/i.test(base)) {
    return {
      title: 'CNC Programming & Machining',
      issuer: 'Manufacturing & Mechatronics Training',
      category: 'CAD / CAM & CNC',
      badgeCode,
    };
  }
  if (/AAV/i.test(base)) {
    return {
      title: 'Arab American Vehicles (AAV) Engineering Training',
      issuer: 'Arab American Vehicles',
      category: 'AUTOMOTIVE ENGINEERING',
      badgeCode,
    };
  }

  return {
    title: clean,
    issuer: 'Verified Certificate',
    category: 'CREDENTIAL',
    badgeCode,
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

  return fs.readdirSync(certificateRoot)
    .filter((file) => /\.(pdf|png|jpe?g|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
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
      };
    });
}
