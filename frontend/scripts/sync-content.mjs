import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const repository = path.resolve(frontend, '..');
const destination = path.join(frontend, 'content');
const source = path.join(repository, 'content');
const persona = path.join(frontend, 'data', 'twin');

async function markdownFiles(directory, root = directory, rejectLinks = false) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (rejectLinks && entry.isSymbolicLink()) {
      throw new Error('Bundled content must not contain linked files or directories.');
    }
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await markdownFiles(filename, root, rejectLinks));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.relative(root, filename));
    }
  }
  return files;
}

function assertInsideContent(filename) {
  const relative = path.relative(destination, filename);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Content synchronization must stay inside frontend/content.');
  }
}

if (existsSync(source)) {
  const canonicalFiles = await markdownFiles(source);
  if (!canonicalFiles.includes('profile.md')) {
    throw new Error('Canonical content/profile.md is missing. Restore the complete source before synchronization.');
  }
  await fs.mkdir(destination, { recursive: true });
  if (path.relative(destination, await fs.realpath(destination))) {
    throw new Error('Bundled content must not be a linked directory.');
  }
  const bundledFiles = await markdownFiles(destination, destination, true);
  for (const filename of canonicalFiles) {
    const target = path.join(destination, filename);
    assertInsideContent(target);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(source, filename), target);
  }
  // A removed or renamed career document must not remain in the deployed Twin.
  const current = new Set(canonicalFiles);
  for (const filename of bundledFiles) {
    if (current.has(filename)) continue;
    const target = path.join(destination, filename);
    assertInsideContent(await fs.realpath(target));
    await fs.unlink(target);
  }
  console.log(`[content] Synced ${canonicalFiles.length} canonical Markdown documents.`);
} else if (!existsSync(path.join(destination, 'profile.md'))) {
  throw new Error('Portfolio content is missing. Run npm run sync:content from the full repository before deploying frontend/.');
}

await fs.mkdir(persona, { recursive: true });
for (const filename of ['facts.json', 'summary.txt', 'style.txt']) {
  const original = path.join(repository, 'backend', 'data', filename);
  const bundled = path.join(persona, filename);
  if (existsSync(original)) await fs.copyFile(original, bundled);
  if (!existsSync(bundled)) throw new Error(`Digital Twin knowledge is missing: data/twin/${filename}.`);
}
JSON.parse(await fs.readFile(path.join(persona, 'facts.json'), 'utf8'));
console.log('[content] Digital Twin persona files are ready for the server functions.');
