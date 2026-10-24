import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const requiredIds = ['about', 'skills', 'projects', 'achievements', 'terminal', 'contact', 'twin'];
const secretPatterns = [
  ['Groq API key', /\bgsk_[A-Za-z0-9]{40,}\b/],
  ['OpenAI API key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Vercel token', /\b(?:vercel_|vca_|vcp_|vct_)[A-Za-z0-9_-]{24,}\b/],
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['JWT token', /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
];
const placeholder = /(?:your[_ -]|replace[_ -]|example|dummy|placeholder|redacted|^\$|^<|^test[_ -])/i;
const excluded = new Set(['.git', 'node_modules', '.next', 'out', '.local', '.venv', '.terraform', '__pycache__',
  '.vercel', '.superpowers', '.aws', '.agents', '.codex', '.memory', '.chroma', 'build', 'dist', 'coverage', 'lambda-package',
  'terraform.tfstate.d', 'audit', 'staging_media', 'scratch_imgs', 'memory', 'github-profile']);
const privateArtifact = /(?:^|\/)(?:node_modules|\.next|out|\.vercel|\.venv|\.terraform|\.local|\.memory|\.chroma|\.superpowers|\.aws|\.agents|\.codex|__pycache__|terraform\.tfstate\.d)(?:\/|$)|\.(?:log|tsbuildinfo|pem|key|tfvars(?:\.json)?|tfstate(?:\.[^/]+)?)$/;
const generatedArtifact = /(?:^|\/)(?:build|dist|coverage|lambda-package)(?:\/|$)|(?:^|\/)(?:\.next|out|build|dist|node_modules|lambda-package|lambda-deployment)(?:-[^/]+)?\.(?:zip|tgz|tar(?:\.gz)?)$/;
const envFile = filename => path.posix.basename(filename).startsWith('.env');
const privateEnv = filename => envFile(filename) && path.posix.basename(filename) !== '.env.example';
const slash = filename => filename.replaceAll('\\', '/');

export function isReleaseArtifact(filename) {
  const file = slash(filename);
  return privateArtifact.test(file) || (!file.startsWith('frontend/public/') && generatedArtifact.test(file));
}

export function secretKinds(text, localSecrets = []) {
  const findings = secretPatterns.filter(([, pattern]) => pattern.test(text)).map(([kind]) => kind);
  const assignments = /\b(?:[A-Z_]*(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|SECRET_KEY|ACCESS_KEY|PASSWORD|TOKEN)|apiKey|accessToken|authToken|accessKey|secretKey|secret|password)\b["']?\s*[:=]\s*["']([^"'\r\n]{20,})["']/gi;
  if ([...text.matchAll(assignments)].some(([, value]) => !placeholder.test(value)
    && /^[A-Za-z0-9+/_=-]+$/.test(value) && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value))) {
    findings.push('credential assignment');
  }
  if (localSecrets.some(secret => secret.length >= 12 && text.includes(secret))) findings.push('local environment credential');
  return [...new Set(findings)];
}

export function inspectTextEntries(entries, location, localSecrets = []) {
  return entries.flatMap(([file, text]) => {
    const kinds = secretKinds(text, localSecrets);
    return kinds.length ? [{ file, reason: `${location}: ${kinds.join(', ')}` }] : [];
  });
}

export async function inspectReleaseContents({ candidates, indexFiles, readSource, readIndex, localSecrets = [] }) {
  const problems = [];
  let sourceFiles = 0;
  const forbidden = file => privateEnv(file) || isReleaseArtifact(file);
  for (const file of candidates) {
    if (forbidden(file)) continue; // Rejected by filename; private archives need not be opened.
    try {
      const content = await readSource(file);
      if (content == null) continue;
      sourceFiles++;
      problems.push(...inspectTextEntries([[file, content.toString('utf8')]], 'source', localSecrets));
    } catch (error) {
      if (error.code !== 'ENOENT') problems.push({ file, reason: 'release candidate could not be read' });
    }
  }
  // A missing working file may still exist in the index until its deletion is staged.
  for (const file of indexFiles) {
    if (forbidden(file)) continue;
    try {
      const content = await readIndex(file);
      if (content == null) throw new Error('Missing index content.');
      problems.push(...inspectTextEntries([[file, content.toString('utf8')]], 'Git index', localSecrets));
    } catch {
      problems.push({ file, reason: 'Git index content could not be read' });
    }
  }
  return { sourceFiles, problems };
}

export function environmentSecrets(text) {
  const values = [];
  for (const match of text.matchAll(/^[ \t]*(?:export[ \t]+)?([A-Z_][A-Z0-9_]*)[ \t]*=[ \t]*(.*?)[ \t]*$/gm)) {
    if (!/API_KEY|TOKEN|SECRET|PASSWORD|ACCESS_KEY/i.test(match[1])) continue;
    if (match[2].startsWith('#')) continue;
    const quoted = /^(["'])(.*?)\1(?:\s+#.*)?$/.exec(match[2]);
    const value = (quoted ? quoted[2] : match[2].replace(/\s+#.*$/, '')).trim();
    if (value && !placeholder.test(value)) values.push(value);
  }
  return values;
}

export function releaseFileProblems({ candidates, indexFiles, environmentFiles, ignored, ignoreProbes = [] }) {
  const problems = [];
  for (const file of new Set([...candidates, ...indexFiles])) {
    if (privateEnv(file)) problems.push({ file, reason: 'private environment file is a release candidate or indexed' });
    else if (isReleaseArtifact(file)) problems.push({ file, reason: 'generated artifact, private cache, state, or key file is a release candidate or indexed' });
  }
  for (const file of new Set([...environmentFiles.filter(privateEnv), ...ignoreProbes])) {
    if (!ignored.has(file)) problems.push({ file, reason: 'required secret/artifact ignore rule is missing' });
  }
  return problems;
}

export function idProblems(html) {
  const ids = [...html.matchAll(/\bid=(["'])([^"']+)\1/g)].map(match => match[2]);
  return requiredIds.filter(id => ids.filter(value => value === id).length !== 1)
    .map(id => ({ file: 'frontend/.next/server/app/index.html', reason: `required ID #${id} is missing or duplicated` }));
}

export function localAssetUrls(text, base = 'https://yousefalsayed.me/') {
  const values = [...text.matchAll(/\b(?:src|href|poster)=(["'])(.*?)\1/g)].map(match => match[2]);
  for (const match of text.matchAll(/\bsrcset=(["'])(.*?)\1/gi)) {
    values.push(...match[2].split(',').map(value => value.trim().split(/\s+/)[0]));
  }
  values.push(...[...text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)].map(match => match[1]));
  const urls = new Set();
  for (const value of values) {
    if (!value || value.startsWith('#') || /^(?:data:|mailto:|tel:)/i.test(value)) continue;
    let url;
    try { url = new URL(value.replaceAll('&amp;', '&'), base); } catch { continue; }
    if (url.origin !== new URL(base).origin) continue;
    if (url.pathname === '/_next/image') {
      const original = url.searchParams.get('url');
      if (original) {
        try {
          const source = new URL(original, base);
          if (source.origin === url.origin) urls.add(source.pathname);
        } catch { continue; }
      }
    } else if (url.pathname !== '/' && !url.pathname.startsWith('/api/')) urls.add(url.pathname);
  }
  return [...urls];
}

async function walk(directory, accepts, skip = excluded) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory() && !skip.has(entry.name)) files.push(...await walk(filename, accepts, skip));
    else if (entry.isFile() && accepts(filename)) files.push(filename);
  }
  return files;
}

function git(repository, args, input, allowedCodes = [0]) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['--no-pager', ...args], { cwd: repository, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = [];
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.resume();
    child.once('error', () => reject(new Error('Read-only Git inspection could not start.')));
    child.once('close', code => allowedCodes.includes(code)
      ? resolve(Buffer.concat(chunks).toString('utf8')) : reject(new Error('Read-only Git inspection failed.')));
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

export async function runReleaseCheck(frontend = fileURLToPath(new URL('../', import.meta.url))) {
  const repository = path.resolve(frontend, '..');
  const relative = filename => slash(path.relative(repository, filename));
  const split = output => output.split('\0').filter(Boolean).map(slash);
  const [candidateOutput, indexOutput, stagedOutput] = await Promise.all([
    git(repository, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']),
    git(repository, ['ls-files', '-z', '--cached']),
    git(repository, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']),
  ]);
  const candidates = [...new Set(split(candidateOutput))];
  const indexFiles = split(indexOutput);
  const environmentFiles = await walk(repository, filename => envFile(slash(filename)));
  const vercelEnv = await fs.readdir(path.join(frontend, '.vercel'), { withFileTypes: true }).catch(() => []);
  environmentFiles.push(...vercelEnv.filter(entry => entry.isFile() && envFile(entry.name))
    .map(entry => path.join(frontend, '.vercel', entry.name)));
  const ignoreProbes = ['.env.local', '.env.production', '.env.production.example', '.env.release-probe', 'frontend/.env.release-probe', 'frontend/.env.local',
    'frontend/.env.production.example', 'frontend/.next/release-probe', 'frontend/out/release-probe',
    'frontend/node_modules/release-probe', 'frontend/.vercel/release-probe', 'release-probe.log', 'frontend/release-probe.tsbuildinfo'];
  const ignored = new Set(split(await git(repository, ['check-ignore', '--no-index', '-z', '--stdin'],
    [...environmentFiles.map(relative), ...ignoreProbes].join('\0') + '\0', [0, 1])));
  const problems = releaseFileProblems({ candidates, indexFiles, environmentFiles: environmentFiles.map(relative), ignored, ignoreProbes });
  const localSecrets = [];
  for (const filename of environmentFiles) {
    localSecrets.push(...environmentSecrets(await fs.readFile(filename, 'utf8')));
  }
  for (const [name, value] of Object.entries(process.env)) {
    if (/API_KEY|TOKEN|SECRET|PASSWORD|ACCESS_KEY/i.test(name) && value && !placeholder.test(value)) localSecrets.push(value);
  }
  const contents = await inspectReleaseContents({ candidates, indexFiles, localSecrets,
    readSource: file => fs.readFile(path.join(repository, file)),
    readIndex: file => git(repository, ['show', `:${file}`]),
  });
  problems.push(...contents.problems);
  const counts = { sourceFiles: contents.sourceFiles, indexFiles: indexFiles.length, stagedFiles: split(stagedOutput).length, environmentFiles: environmentFiles.length,
    browserFiles: 0, knowledgeFiles: 0, requiredIds: requiredIds.length, assets: 0 };

  try {
    const manifests = await readJson(path.join(frontend, '.next/server/app-paths-manifest.json'));
    const prerender = await readJson(path.join(frontend, '.next/prerender-manifest.json'));
    const vercel = await readJson(path.join(frontend, 'vercel.json'));
    if (vercel.framework !== 'nextjs' || vercel.outputDirectory != null || vercel.rewrites?.some(route => route.source?.startsWith('/api'))) {
      problems.push({ file: 'frontend/vercel.json', reason: 'native Next.js API routing is not configured' });
    }
    const knowledge = (await walk(path.join(repository, 'content'), filename => filename.endsWith('.md'), new Set()))
      .map(source => ({ source, bundled: path.join(frontend, 'content', path.relative(path.join(repository, 'content'), source)) }));
    for (const name of ['facts.json', 'summary.txt', 'style.txt']) {
      knowledge.push({ source: path.join(repository, 'backend/data', name), bundled: path.join(frontend, 'data/twin', name) });
    }
    counts.knowledgeFiles = knowledge.length;
    for (const { source, bundled } of knowledge) {
      const [original, copy] = await Promise.all([fs.readFile(source), fs.readFile(bundled)]);
      if (!original.equals(copy)) problems.push({ file: relative(bundled), reason: 'bundled knowledge differs from its canonical source' });
    }
    for (const route of ['chat', 'health']) {
      if (!manifests[`/api/${route}/route`] || prerender.routes?.[`/api/${route}`]) {
        problems.push({ file: `frontend/app/api/${route}/route.ts`, reason: 'native dynamic API route is missing or statically exported' });
      }
      const traceFile = path.join(frontend, `.next/server/app/api/${route}/route.js.nft.json`);
      const trace = await readJson(traceFile);
      const traced = new Set(trace.files.map(filename => path.resolve(path.dirname(traceFile), slash(filename))));
      for (const { bundled } of knowledge) {
        if (!traced.has(bundled)) problems.push({ file: relative(bundled), reason: `knowledge is missing from the ${route} function trace` });
      }
    }
    const htmlFile = path.join(frontend, '.next/server/app/index.html');
    const html = await fs.readFile(htmlFile, 'utf8');
    problems.push(...idProblems(html));
    const assets = new Set(localAssetUrls(html));
    const browserFiles = await walk(path.join(frontend, '.next/static'), filename => /\.(?:js|css|html|json)$/.test(filename));
    counts.browserFiles = browserFiles.length;
    for (const filename of [...browserFiles, htmlFile]) {
      const text = await fs.readFile(filename, 'utf8');
      problems.push(...inspectTextEntries([[relative(filename), text]], 'browser output', localSecrets));
      if (filename.endsWith('.css')) {
        const cssUrl = `https://yousefalsayed.me/_next/${slash(path.relative(path.join(frontend, '.next'), filename))}`;
        for (const asset of localAssetUrls(text, cssUrl)) assets.add(asset);
      }
    }
    counts.assets = assets.size;
    for (const asset of assets) {
      const metadataRoute = manifests[`${asset}/route`];
      if (metadataRoute && (await fs.stat(path.join(frontend, '.next/server', metadataRoute)).catch(() => null))?.isFile()) continue;
      const root = asset.startsWith('/_next/static/') ? path.join(frontend, '.next/static') : path.join(frontend, 'public');
      const tail = asset.startsWith('/_next/static/') ? asset.slice('/_next/static/'.length) : asset.slice(1);
      const filename = path.resolve(root, decodeURIComponent(tail));
      if (!filename.startsWith(root + path.sep) || !(await fs.stat(filename).catch(() => null))?.isFile()) {
        problems.push({ file: relative(filename), reason: 'referenced local production asset is missing or outside its asset directory' });
      }
    }
  } catch {
    problems.push({ file: 'frontend/.next', reason: 'production manifests, knowledge, or HTML could not be inspected; run npm run build' });
  }
  return { counts, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { counts, problems } = await runReleaseCheck();
    console.log(`[release] ${problems.length ? 'FAIL' : 'PASS'}: ${counts.sourceFiles} source files, ${counts.indexFiles} index files, ${counts.stagedFiles} staged changes, ${counts.browserFiles} browser files, ${counts.knowledgeFiles} knowledge files, ${counts.requiredIds} IDs, ${counts.assets} local assets.`);
    for (const { file, reason } of problems) console.error(`[release] ${JSON.stringify(file)}: ${reason}`);
    process.exitCode = problems.length ? 1 : 0;
  } catch {
    console.error('[release] FAIL: read-only repository inspection could not complete.');
    process.exitCode = 1;
  }
}
