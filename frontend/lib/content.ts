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
  type: 'pdf' | 'image';
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
    .map((file) => ({
      id: file,
      title: file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      src: `/certificates/${encodeURIComponent(file)}`,
      type: /\.pdf$/i.test(file) ? 'pdf' as const : 'image' as const,
    }));
}
