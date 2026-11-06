import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNativeTwinRouting, productionSite, resolveSiteProject } from './vercel-target.mjs';
import { upsertVercelEnvironment, vercelJsonMutation } from './vercel-api.mjs';
import { requiredIds } from './release-check.mjs';
import { buildEnvironment } from './windows-environment.mjs';
import { publicTwinTransport, readPortfolioSources, verifyTwin } from './twin-verification.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const checkOnly = process.argv.includes('--check');
const statusFile = path.join(frontend, '.vercel', checkOnly ? 'twin-preflight-status.json' : 'twin-production-status.json');
const fallbackUrl = 'https://uvsk3twnk5.execute-api.eu-north-1.amazonaws.com';
const domainOption = process.argv.find(value => value.startsWith('--domain='));
const siteOption = process.argv.find(value => value.startsWith('--site='));
let customDomain;
let site;
const report = { startedAt: new Date().toISOString(), status: 'preparing', checks: {}, productionUrl: null, remoteMutationAttempted: false, remoteChangesMade: false };
const secrets = [];
let phase = 'local configuration';
let vercelCli;
let vercelScope;

function safe(text) {
  return secrets.reduce((value, secret) => secret ? value.split(secret).join('[redacted]') : value, String(text));
}

function run(command, args, { input, quiet = false, timeoutMs = 600_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: frontend, env: buildEnvironment(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code !== 0 || timedOut) {
        reject(new Error(safe(timedOut ? 'Command timed out.' : stderr.trim() || stdout.trim() || `Command exited with ${code}.`)));
      } else {
        if (!quiet && stdout.trim()) console.log(safe(stdout.trim()));
        if (!quiet && stderr.trim()) console.log(safe(stderr.trim()));
        resolve(stdout);
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npm = (args, options) => run(process.execPath, [npmCli, ...args], options);
const cli = (args, options) => {
  if (args[0] === 'curl') {
    const dashDashIndex = args.indexOf('--');
    const curlArgs = dashDashIndex !== -1
      ? [...args.slice(0, dashDashIndex), ...(vercelScope ? ['--scope', vercelScope] : []), ...args.slice(dashDashIndex)]
      : [...args, ...(vercelScope ? ['--scope', vercelScope] : [])];
    return run(process.execPath, [vercelCli, ...curlArgs], options);
  }
  return run(process.execPath, [vercelCli, '--no-color', '--non-interactive', ...(vercelScope ? ['--scope', vercelScope] : []), ...args], options);
};

async function findCli() {
  if (process.env.VERCEL_CLI_PATH && existsSync(process.env.VERCEL_CLI_PATH)) return process.env.VERCEL_CLI_PATH;
  const local = path.join(frontend, 'node_modules', 'vercel', 'dist', 'index.js');
  if (existsSync(local)) return local;
  const cache = (await npm(['config', 'get', 'cache'], { quiet: true })).trim();
  const npx = path.join(cache, '_npx');
  if (existsSync(npx)) {
    for (const entry of await fs.readdir(npx)) {
      const candidate = path.join(npx, entry, 'node_modules', 'vercel', 'dist', 'index.js');
      if (existsSync(candidate)) return candidate;
    }
  }
  const prefix = (await npm(['config', 'get', 'prefix'], { quiet: true })).trim();
  const global = path.join(prefix, process.platform === 'win32' ? 'node_modules' : 'lib/node_modules', 'vercel', 'dist', 'index.js');
  if (existsSync(global)) return global;
  throw new Error('Vercel CLI is not installed or cached. Install it with npm install --global vercel, then run this command again.');
}

async function patchVercelNextCache() {
  if (process.platform !== 'win32') return;
  try {
    const cache = (await npm(['config', 'get', 'cache'], { quiet: true })).trim();
    const npx = path.join(cache, '_npx');
    if (!existsSync(npx)) return;
    for (const entry of await fs.readdir(npx)) {
      const target = path.join(npx, entry, 'node_modules', '@vercel', 'next', 'dist', 'index.js');
      if (!existsSync(target)) continue;
      let text = await fs.readFile(target, 'utf8');
      let changed = false;
      if (text.includes('originalPagePath = import_path5.default.relative(appDir, fsPath);')) {
        text = text.replace('originalPagePath = import_path5.default.relative(appDir, fsPath);', 'originalPagePath = import_path5.default.relative(appDir, fsPath).replaceAll("\\\\", "/");');
        changed = true;
      }
      if (text.includes('return pageBuildTraces[page + ".nft.json"] || appBuildTraces[page + ".nft.json"];')) {
        text = text.replace('return pageBuildTraces[page + ".nft.json"] || appBuildTraces[page + ".nft.json"];', 'const norm = page.replaceAll("\\\\", "/"); return pageBuildTraces[norm + ".nft.json"] || appBuildTraces[norm + ".nft.json"] || pageBuildTraces[page + ".nft.json"] || appBuildTraces[page + ".nft.json"];');
        changed = true;
      }
      const oldAsyncSymlink = `      if (!await pathExists2(dir)) {
        await mkdirs(dir);
      }
      return fs5.symlink(srcpath, dstpath, toType);`;
      const newAsyncSymlink = `      if (!await pathExists2(dir)) {
        await mkdirs(dir);
      }
      try {
        return await fs5.symlink(srcpath, dstpath, toType);
      } catch (err) {
        if (err.code === "EPERM" || err.code === "EACCES") {
          const absSrc = path6.resolve(dir, srcpath);
          const copy = require_copy();
          return copy(absSrc, dstpath);
        }
        throw err;
      }`;
      if (text.includes(oldAsyncSymlink)) {
        text = text.replace(oldAsyncSymlink, newAsyncSymlink);
        changed = true;
      }
      const oldSyncSymlink = `      const exists = fs5.existsSync(dir);
      if (exists)
        return fs5.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs5.symlinkSync(srcpath, dstpath, type);`;
      const newSyncSymlink = `      const exists = fs5.existsSync(dir);
      if (!exists) mkdirsSync(dir);
      try {
        return fs5.symlinkSync(srcpath, dstpath, type);
      } catch (err) {
        if (err.code === "EPERM" || err.code === "EACCES") {
          const absSrc = path6.resolve(dir, srcpath);
          const copySync = require_copy_sync();
          return copySync(absSrc, dstpath);
        }
        throw err;
      }`;
      if (text.includes(oldSyncSymlink)) {
        text = text.replace(oldSyncSymlink, newSyncSymlink);
        changed = true;
      }
      if (changed) await fs.writeFile(target, text, 'utf8');
    }
    for (const entry of await fs.readdir(npx)) {
      const adapterTarget = path.join(npx, entry, 'node_modules', '@vercel', 'next', 'dist', 'adapter', 'index.js');
      if (!existsSync(adapterTarget)) continue;
      let aText = await fs.readFile(adapterTarget, 'utf8');
      const oldSymlink = `          await import_promises.default.symlink(
            import_node_path.default.relative(
              import_node_path.default.dirname(prerenderFunctionDir),
              parentFunctionDir
            ),
            prerenderFunctionDir
          ).catch((err) => {
            if (!(typeof err === "object" && err && err.code === "EEXIST")) {
              throw err;
            }
          });`;
      const newSymlink = `          await import_promises.default.symlink(
            import_node_path.default.relative(
              import_node_path.default.dirname(prerenderFunctionDir),
              parentFunctionDir
            ),
            prerenderFunctionDir
          ).catch(async (err) => {
            if (err && (err.code === "EPERM" || err.code === "EACCES")) {
              await import_promises.default.cp(parentFunctionDir, prerenderFunctionDir, { recursive: true });
              return;
            }
            if (!(typeof err === "object" && err && err.code === "EEXIST")) {
              throw err;
            }
          });`;
      const normalizedAText = aText.replaceAll('\r\n', '\n');
      if (normalizedAText.includes(oldSymlink)) {
        aText = normalizedAText.replace(oldSymlink, newSymlink);
        await fs.writeFile(adapterTarget, aText, 'utf8');
      }
    }
    for (const entry of await fs.readdir(npx)) {
      const chunksDir = path.join(npx, entry, 'node_modules', 'vercel', 'dist', 'chunks');
      if (!existsSync(chunksDir)) continue;
      for (const chunkFile of await fs.readdir(chunksDir)) {
        if (!chunkFile.endsWith('.js')) continue;
        const chunkPath = path.join(chunksDir, chunkFile);
        let cText = await fs.readFile(chunkPath, 'utf8');
        const oldFuncSymlink = 'return await import_fs_extra.default.mkdirp(destDir),await import_fs_extra.default.symlink(target,dest),!0';
        const newFuncSymlink = 'await import_fs_extra.default.mkdirp(destDir);try{await import_fs_extra.default.symlink(target,dest)}catch(err){if(err&&(err.code==="EPERM"||err.code==="EACCES")){await (await import("node:fs/promises")).cp(targetDest,dest,{recursive:!0})}else{throw err}}return!0';
        if (cText.includes(oldFuncSymlink)) {
          cText = cText.replace(oldFuncSymlink, newFuncSymlink);
          await fs.writeFile(chunkPath, cText, 'utf8');
        }
      }
    }
  } catch {
    // Ignore cache patch errors
  }
}

async function verifyBuild() {
  const tracePath = path.join(frontend, '.next', 'server', 'app', 'api', 'chat', 'route.js.nft.json');
  const trace = JSON.parse(await fs.readFile(tracePath, 'utf8'));
  const files = trace.files.map(file => file.replaceAll('\\', '/'));
  for (const file of ['content/profile.md', 'content/experience.md', 'content/achievements.md', 'content/expertise.md', 'content/projects/r2-waiter.md', 'data/twin/facts.json', 'data/twin/summary.txt', 'data/twin/style.txt', 'data/twin/guardrails.json']) {
    assert.ok(files.some(value => value.endsWith(file)), `Chat function trace omits ${file}.`);
  }
  const manifests = JSON.parse(await fs.readFile(path.join(frontend, '.next', 'server', 'app-paths-manifest.json'), 'utf8'));
  for (const route of ['/api/chat/route', '/api/health/route']) assert.ok(manifests[route], `Native route missing: ${route}.`);
  async function scan(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (/\.(js|json|html)$/.test(entry.name)) {
        const source = await fs.readFile(file, 'utf8');
        assert.ok(!secrets.some(secret => secret && source.includes(secret)), 'A secret was found in the browser build. Deployment stopped.');
      }
    }
  }
  await scan(path.join(frontend, '.next', 'static'));
  report.checks.buildArtifacts = 'pass: native routes, bundled knowledge, and no browser secrets';
}

async function publicRequest(deployment, pathname, { body, head = false } = {}) {
  return fetch(new URL(pathname, deployment), {
    method: head ? 'HEAD' : body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(45_000),
  });
}

async function verifyLive(deployment, full = true, publicAccess = false) {
  const policy = JSON.parse(await fs.readFile(path.join(frontend, 'data/twin/guardrails.json'), 'utf8'));
  const request = publicAccess ? publicTwinTransport(deployment) : async (pathname, body) => {
    const args = ['curl', pathname, '--deployment', deployment, '--', '--silent', '--show-error', '--max-time', '45'];
    if (body) args.push('--request', 'POST', '--header', 'Content-Type: application/json', '--data-binary', '@-');
    args.push('--write-out', '\n%{http_code}');
    const output = await cli(args, { quiet: true, input: body ? JSON.stringify(body) : undefined, timeoutMs: 60_000 });
    const separator = output.lastIndexOf('\n');
    assert.ok(separator >= 0, 'The candidate API returned no HTTP status.');
    const status = Number(output.slice(separator + 1).trim());
    let data;
    try { data = JSON.parse(output.slice(0, separator)); } catch { throw new Error(`The candidate API returned non-JSON at ${pathname} (HTTP ${status}).`); }
    return { status, data };
  };
  const verified = { status: 'running', checks: [] };
  report.checks[full ? 'candidateTwin' : 'productionTwin'] = verified;
  try {
    Object.assign(verified, await verifyTwin({ request, sources: await readPortfolioSources(), policyVersion: policy.version,
      checks: verified.checks, pace: 65_000,
      onCheck: (check) => console.log(`[verify] PASS ${check.name}`),
      onRetry: (name) => console.log(`[verify] Retrying ${name} after a provider or token-limit pause.`) }));
  } catch (error) {
    verified.status = 'failed';
    throw error;
  }
  let html;
  if (publicAccess) {
    const page = await publicRequest(deployment, '/');
    assert.ok(page.ok, `Public production page failed (${page.status}).`);
    html = await page.text();
  } else {
    html = await cli(['curl', '/', '--deployment', deployment, '--', '--silent', '--show-error', '--fail', '--max-time', '30'], { quiet: true, timeoutMs: 45_000 });
  }
  assert.ok(html.includes('Yousef'), 'Production portfolio is blank.');
  for (const id of requiredIds) {
    assert.equal([...html.matchAll(new RegExp(`\\bid="${id}"`, 'g'))].length, 1, `Production section missing or duplicated: ${id}.`);
  }
  for (const asset of ['/resume.pdf', '/graduation/r2-waiter-gallery-video-poster.jpg', '/graduation/r2-waiter-gallery-video.mp4']) {
    if (publicAccess) {
      const response = await publicRequest(deployment, asset, { head: true });
      assert.ok(response.ok, `Public production asset failed: ${asset} (${response.status}).`);
    } else {
      await cli(['curl', asset, '--deployment', deployment, '--', '--silent', '--show-error', '--head', '--fail', '--max-time', '20'], { quiet: true, timeoutMs: 30_000 });
    }
  }
  report.checks.productionAssets = `pass: ${requiredIds.length} required sections, resume, gallery poster, and video`;
  if (publicAccess) report.checks.publicProductionAccess = 'pass: anonymous page, native chat, health, and media';
}

try {
  process.env.NODE_ENV = 'production';
  require('@next/env').loadEnvConfig(frontend, false, { info() {}, warn() {}, error() {} });
  customDomain = domainOption?.slice('--domain='.length) || process.env.TWIN_CUSTOM_DOMAIN;
  site = productionSite(siteOption?.slice('--site='.length) || process.env.TWIN_PRODUCTION_URL);
  if (site) report.requestedProductionUrl = site;
  const backendEnv = path.resolve(frontend, '..', 'backend', '.env');
  if (!process.env.GROQ_API_KEY && existsSync(backendEnv)) process.loadEnvFile(backendEnv);
  const key = process.env.GROQ_API_KEY?.trim();
  assert.ok(key && !/^(your_|replace_|<)/i.test(key), 'Set GROQ_API_KEY in an ignored frontend/.env.local or backend/.env before deployment.');
  secrets.push(key, process.env.VERCEL_TOKEN);
  if (process.platform === 'win32' && process.env.APPDATA) {
    const authPath = path.join(process.env.APPDATA, 'com.vercel.cli', 'Data', 'auth.json');
    if (existsSync(authPath)) {
      const auth = JSON.parse(await fs.readFile(authPath, 'utf8'));
      if (auth.token) secrets.push(auth.token);
    }
  }
  const config = JSON.parse(await fs.readFile(path.join(frontend, 'vercel.json'), 'utf8'));
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.outputDirectory, null, 'Vercel must use the native Next.js output.');
  assert.ok(!config.rewrites?.some(route => route.source.startsWith('/api/')), 'An API rewrite would shadow the native Twin.');
  const projectLinkFile = path.join(frontend, '.vercel', 'project.json');
  let linked = JSON.parse(await fs.readFile(projectLinkFile, 'utf8'));
  assert.ok(linked.projectId && linked.orgId, 'Link the existing Vercel project before deployment.');
  if (linked.orgId.startsWith('team_')) vercelScope = linked.orgId;
  if (customDomain) assert.ok(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(customDomain), 'Supply a valid owned domain via --domain=example.com.');
  process.env.VERCEL_TELEMETRY_DISABLED = '1';
  process.env.NEXT_PUBLIC_DEPLOY_TARGET = 'vercel';
  process.env.NEXT_PUBLIC_API_URL = '/api';
  process.env.NEXT_PUBLIC_API_URL_FALLBACK = fallbackUrl;
  process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  process.env.GROQ_MODEL_FALLBACK = 'openai/gpt-oss-20b';
  vercelCli = await findCli();
  report.project = { id: linked.projectId, name: linked.projectName };
  await verifyBuild();
  report.checks.localConfiguration = 'pass';
  if (checkOnly) {
    report.status = 'ready-for-deployment';
    console.log('[deploy] Local configuration and existing build verified; no remote changes made.');
  } else {
    phase = 'Vercel authentication/network';
    await cli(['whoami'], { timeoutMs: 30_000 });
    const query = `?teamId=${encodeURIComponent(linked.orgId)}`;
    if (site) {
      phase = 'resolving the production domain project';
      const inspected = JSON.parse(await cli(['inspect', site, '--json'], { quiet: true, timeoutMs: 60_000 }));
      assert.match(inspected.id || '', /^dpl_[A-Za-z0-9]+$/, 'Vercel did not resolve the production site to a deployment.');
      const liveDeployment = JSON.parse(await cli(['api', `/v13/deployments/${encodeURIComponent(inspected.id)}${query}`, '--raw'], { quiet: true, timeoutMs: 30_000 }));
      assert.match(liveDeployment.projectId || '', /^prj_[A-Za-z0-9]+$/, 'The production site has no associated project.');
      const projectPath = `/v9/projects/${encodeURIComponent(liveDeployment.projectId)}`;
      const project = JSON.parse(await cli(['api', `${projectPath}${query}`, '--raw'], { quiet: true, timeoutMs: 30_000 }));
      const domain = JSON.parse(await cli(['api', `${projectPath}/domains/${encodeURIComponent(new URL(site).hostname)}${query}`, '--raw'], { quiet: true, timeoutMs: 30_000 }));
      linked = resolveSiteProject(site, inspected, liveDeployment, project, domain, linked);
      await fs.writeFile(projectLinkFile, JSON.stringify(linked, null, 2));
      report.project = { id: linked.projectId, name: linked.projectName };
      report.checks.targetDomain = { site, projectId: linked.projectId, status: 'pass: existing domain project verified in the linked account/team' };
    }
    const projectApi = `/v9/projects/${encodeURIComponent(linked.projectId)}${query}`;
    phase = 'project settings';
    report.remoteMutationAttempted = true;
    await vercelJsonMutation(cli, projectApi, 'PATCH', {
      framework: config.framework, buildCommand: config.buildCommand, installCommand: config.installCommand, outputDirectory: null, rootDirectory: null,
    });
    report.remoteChangesMade = true;
    report.checks.projectSettings = 'pass: native Next.js framework and output settings updated';
    const environment = [
      { key: 'GROQ_API_KEY', value: key, type: 'sensitive', target: ['production'] },
      ...Object.entries({ NEXT_PUBLIC_DEPLOY_TARGET: 'vercel', NEXT_PUBLIC_API_URL: '/api', NEXT_PUBLIC_API_URL_FALLBACK: fallbackUrl, GROQ_MODEL: 'openai/gpt-oss-120b', GROQ_MODEL_FALLBACK: 'openai/gpt-oss-20b' })
        .map(([name, value]) => ({ key: name, value, type: 'plain', target: ['production'] })),
    ];
    phase = 'production environment';
    const uploaded = [];
    report.checks.productionEnvironment = { status: 'in-progress', uploaded };
    await upsertVercelEnvironment(cli, `/v10/projects/${encodeURIComponent(linked.projectId)}/env${query}&upsert=true`, environment,
      name => uploaded.push(name));
    report.checks.productionEnvironment.status = 'pass';
    phase = 'pulling production settings';
    await cli(['pull', '--yes', '--environment', 'production'], { timeoutMs: 60_000 });
    const pulledLink = JSON.parse(await fs.readFile(projectLinkFile, 'utf8'));
    if (pulledLink.settings?.rootDirectory) { pulledLink.settings.rootDirectory = null; await fs.writeFile(projectLinkFile, JSON.stringify(pulledLink, null, 2)); }
    phase = 'tests and production build';
    await npm(['test']);
    await npm(['run', 'lint']);
    await patchVercelNextCache();
    try {
      await cli(['build', '--prod', '--yes'], { timeoutMs: 1_200_000 });
    } catch (buildErr) {
      if (String(buildErr?.message).includes('EPERM') || String(buildErr?.message).includes('4294963248')) {
        console.log('[deploy] Transient file lock during vercel build; waiting 3s and retrying...');
        await new Promise(r => setTimeout(r, 3000));
        await cli(['build', '--prod', '--yes'], { timeoutMs: 1_200_000 });
      } else {
        throw buildErr;
      }
    }
    await verifyBuild();
    async function scrubEnvFromConfigs(dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await scrubEnvFromConfigs(full);
        else if (entry.name === '.vc-config.json') {
          const config = JSON.parse(await fs.readFile(full, 'utf8'));
          if (config.filePathMap) {
            let changed = false;
            for (const [key, val] of Object.entries(config.filePathMap)) {
              if (key.startsWith('.env') || (typeof val === 'string' && val.startsWith('.env'))) {
                delete config.filePathMap[key];
                changed = true;
              }
            }
            if (changed) await fs.writeFile(full, JSON.stringify(config, null, 2));
          }
        }
      }
    }
    const outputFunctions = path.join(frontend, '.vercel', 'output', 'functions');
    if (existsSync(outputFunctions)) await scrubEnvFromConfigs(outputFunctions);
    phase = 'production candidate deployment';
    const deploymentText = await cli(['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--json'], { quiet: true, timeoutMs: 600_000 });
    const deploymentResult = JSON.parse(deploymentText);
    const value = deploymentResult.url || deploymentResult.deploymentUrl || deploymentResult.deployment?.url;
    assert.ok(value, 'Vercel did not return a deployment URL.');
    const candidate = value.startsWith('https://') ? value : `https://${value}`;
    report.candidateUrl = candidate;
    phase = 'live candidate verification';
    await cli(['inspect', candidate, '--wait', '--timeout', '120s'], { timeoutMs: 180_000 });
    const candidateDeployment = JSON.parse(await cli(['api', `/v13/deployments/${encodeURIComponent(new URL(candidate).hostname)}${query}`, '--raw'], { quiet: true, timeoutMs: 30_000 }));
    assert.equal(candidateDeployment.readyState, 'READY');
    assert.equal(candidateDeployment.target, 'production');
    assert.equal(candidateDeployment.projectId, linked.projectId, 'Candidate belongs to a different Vercel project.');
    assertNativeTwinRouting(candidateDeployment.routes);
    report.checks.candidateProject = 'pass: ready production candidate in the linked project';
    await verifyLive(candidate);
    if (customDomain) {
      phase = 'custom domain attachment';
      await vercelJsonMutation(cli, `/v10/projects/${encodeURIComponent(linked.projectId)}/domains${query}`, 'POST', { name: customDomain });
      report.customDomain = { name: customDomain, status: 'attached; Namecheap DNS verification still required' };
    }
    phase = 'production promotion and final verification';
    await cli(['promote', candidate, '--yes', '--timeout', '120s'], { timeoutMs: 180_000 });
    const deployment = JSON.parse(await cli(['api', `/v13/deployments/${encodeURIComponent(new URL(candidate).hostname)}${query}`, '--raw'], { quiet: true, timeoutMs: 30_000 }));
    assert.equal(deployment.readyState, 'READY');
    assert.equal(deployment.target, 'production');
    assert.equal(deployment.projectId, linked.projectId);
    const alias = deployment.alias?.find(name => name.endsWith('.vercel.app'));
    report.productionUrl = site || (alias ? `https://${alias}` : candidate);
    if (site) {
      const live = JSON.parse(await cli(['inspect', site, '--json'], { quiet: true, timeoutMs: 60_000 }));
      assert.equal(live.id, deployment.id, 'The custom domain still points to another deployment.');
      report.checks.productionDomain = 'pass: requested custom domain serves the promoted deployment';
    }
    await verifyLive(report.productionUrl, false, true);
    report.status = 'deployed-and-verified';
    console.log(`[deploy] Production URL: ${report.productionUrl}`);
    console.log('[deploy] Real Groq answers, follow-ups, profile facts, and media verified.');
    console.log('Namecheap DNS: A @ -> 76.76.21.21; CNAME www -> cname.vercel-dns.com; TTL Automatic.');
    console.log('[deploy] The configured AWS gateway is retired; AWS is not a verified live backup.');
  }
} catch (error) {
  report.status = 'failed';
  report.phase = phase;
  report.error = safe(error.message);
  console.error(`[deploy] Stopped during ${phase}: ${report.error}`);
  if (phase === 'Vercel authentication/network') console.error('[deploy] Run npm run deploy:vercel from a regular terminal with Vercel network access and an active login.');
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(statusFile), { recursive: true });
  await fs.writeFile(statusFile, JSON.stringify(report, null, 2));
}
