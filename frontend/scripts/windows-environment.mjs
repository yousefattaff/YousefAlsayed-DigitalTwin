import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';

export function buildEnvironment(environment = process.env, platform = process.platform, exists = existsSync) {
  if (platform !== 'win32') return { ...environment };
  const entries = Object.entries(environment);
  const value = (name) => entries.find(([key]) => key.toLowerCase() === name)?.[1];
  const roots = [value('systemroot'), value('windir'), 'C:\\Windows'].filter(Boolean);
  const candidates = [value('comspec'), ...roots.map((root) => path.win32.join(root, 'System32', 'cmd.exe'))];
  const shell = candidates.find((candidate) => candidate && path.win32.isAbsolute(candidate) && exists(candidate));
  assert.ok(shell, 'Windows command shell is missing. Restore cmd.exe before deploying.');
  // Vercel's build worker reads the lowercase key from a case-sensitive env copy.
  const result = Object.fromEntries(entries.filter(([key]) => !['path', 'comspec'].includes(key.toLowerCase())));
  result.comspec = shell;
  const system32 = path.win32.dirname(shell);
  const paths = (value('path') || '').split(';').filter(Boolean);
  if (!paths.some((entry) => path.win32.normalize(entry).toLowerCase() === system32.toLowerCase())) paths.unshift(system32);
  result.PATH = paths.join(';');
  return result;
}
