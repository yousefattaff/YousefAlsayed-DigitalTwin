import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = fileURLToPath(new URL('../', import.meta.url));
const backendDir = path.resolve(frontendDir, '../backend');
const nextBin = path.join(frontendDir, 'node_modules/next/dist/bin/next');
const ownedChildren = new Set();
let stopping = false;

function message(text) {
  console.log(`[dev] ${text}`);
}

function checkNativeSetup() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || /^(your_|replace_|<)/i.test(key)) {
    throw new Error('Set the server-only GROQ_API_KEY in frontend/.env.local. Never prefix this secret with NEXT_PUBLIC_.');
  }
  const files = ['content/profile.md', 'data/twin/facts.json', 'data/twin/summary.txt', 'data/twin/style.txt'];
  if (files.some((file) => !existsSync(path.join(frontendDir, file)))) {
    throw new Error('Digital Twin knowledge is missing. Run npm run sync:content in frontend/ before starting Next.js.');
  }
  message('Native Digital Twin configuration is ready. Model requests are checked when you send a message.');
}

function stopOwnedChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore', windowsHide: true, timeout: 5000,
    });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
  }
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of ownedChildren) stopOwnedChild(child);
  process.exit(code);
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));

function startOwnedChild(command, args, options, name) {
  const child = spawn(command, args, {
    ...options, stdio: 'inherit', windowsHide: true,
    detached: process.platform !== 'win32',
  });
  ownedChildren.add(child);
  child.once('error', () => {
    console.error(`[dev] Could not start ${name}. Check its installation and permissions.`);
    shutdown(1);
  });
  child.once('exit', (code) => {
    if (!stopping) {
      if (code) console.error(`[dev] ${name} exited with code ${code}.`);
      shutdown(code ?? 1);
    }
  });
  return child;
}

function findPython() {
  const venvPython = path.join(backendDir, '.venv', process.platform === 'win32'
    ? 'Scripts/python.exe' : 'bin/python');
  const candidates = existsSync(venvPython) ? [[venvPython, []]] :
    process.platform === 'win32' ? [['python', []], ['py', ['-3']]] :
      [['python3', []], ['python', []]];
  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, '--version'], {
      cwd: backendDir, encoding: 'utf8', windowsHide: true, timeout: 5000,
    });
    const version = `${result.stdout ?? ''}${result.stderr ?? ''}`.match(/Python (\d+)\.(\d+)/);
    if (result.status === 0 && version && Number(version[1]) === 3 && Number(version[2]) >= 12) {
      return { command, prefix };
    }
  }
  throw new Error('Python 3.12+ is required. Run uv sync --frozen --no-dev from backend/ first.');
}

function checkBackendSetup(python) {
  const script = [
    'import importlib.util, json, os, sys',
    'modules = ["uvicorn", "fastapi", "dotenv", "groq", "chromadb", "boto3", "pydantic"]',
    'missing = [name for name in modules if importlib.util.find_spec(name) is None]',
    'if missing:',
    '    print(json.dumps({"missing": missing})); sys.exit(1)',
    'from dotenv import load_dotenv',
    'load_dotenv(".env", override=True)',
    'key = os.getenv("GROQ_API_KEY", "").strip()',
    'configured = bool(key) and not key.lower().startswith(("your_", "replace_", "<"))',
    'print(json.dumps({"key_configured": configured}))',
    'sys.exit(0 if configured else 2)',
  ].join('\n');
  const result = spawnSync(python.command, [...python.prefix, '-c', script], {
    cwd: backendDir, encoding: 'utf8', windowsHide: true, timeout: 15000,
  });
  let details;
  try { details = JSON.parse(result.stdout?.trim() || '{}'); } catch { /* Use the generic setup error. */ }
  if (details?.missing?.length) {
    throw new Error(`Backend dependencies are missing: ${details.missing.join(', ')}. Run uv sync --frozen --no-dev from backend/.`);
  }
  if (details?.key_configured === false) {
    throw new Error('Set a real GROQ_API_KEY in backend/.env for the local AWS/external API mode. Never use a NEXT_PUBLIC_ prefix for provider keys.');
  }
  if (result.status !== 0) {
    throw new Error('Backend setup could not be checked. Run uv sync --frozen --no-dev from backend/.');
  }
}

async function backendHealth(endpoint) {
  try {
    const response = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(2000) });
    const data = response.ok ? await response.json().catch(() => null) : null;
    return {
      reachable: true,
      ready: data?.status === 'healthy' && typeof data?.rag_documents === 'number',
      data,
    };
  } catch {
    return { reachable: false, ready: false, data: null };
  }
}

function portOpen(hostname, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: hostname.replace(/^\[|\]$/g, ''), port });
    const finish = (open) => { socket.destroy(); resolve(open); };
    socket.setTimeout(1000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

function cliValue(args, short, long) {
  const index = args.findIndex((arg) => arg === long || arg.startsWith(`${long}=`) || arg.startsWith(short));
  if (index === -1) return undefined;
  const flag = args[index];
  const value = flag.startsWith(`${long}=`) ? flag.slice(long.length + 1) :
    flag.startsWith(short) && flag !== short ? flag.slice(short.length) : args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${long} needs a value.`);
  return value;
}

async function portfolioRunning(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('id="about"') && html.includes('id="twin"') && html.includes('Yousef');
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npm run dev -- [Next.js dev options]\n\nDefault target=vercel starts or reuses Next.js with /api/chat and /api/health; no Python server is needed.\nSet NEXT_PUBLIC_DEPLOY_TARGET=aws and NEXT_PUBLIC_API_URL for the optional external API mode.\nCtrl+C stops only services started by this command. Use npm run dev:check to check configuration without a model request.\nExample: npm run dev -- --port 3001');
    return;
  }
  const checkOnly = args.includes('--check');
  const nextArgs = args.filter((arg) => arg !== '--check');
  if (!existsSync(nextBin)) throw new Error('Frontend dependencies are missing. Run npm ci in frontend/.');
  process.env.NODE_ENV = 'development';
  const require = createRequire(nextBin);
  require('@next/env').loadEnvConfig(frontendDir, true, { info() {}, warn() {}, error() {} });
  const target = process.env.NEXT_PUBLIC_DEPLOY_TARGET?.trim().toLowerCase() || 'vercel';
  if (!['vercel', 'aws'].includes(target)) {
    throw new Error('NEXT_PUBLIC_DEPLOY_TARGET must be vercel or aws.');
  }
  const frontendPort = Number(cliValue(nextArgs, '-p', '--port') ?? process.env.PORT ?? 3000);
  if (!Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65535) {
    throw new Error('Choose a valid frontend port, for example npm run dev -- --port 3001.');
  }
  let endpoint;
  if (target === 'vercel') {
    checkNativeSetup();
  } else {
    let apiUrl;
    try { apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:8000'); } catch {
      throw new Error('NEXT_PUBLIC_API_URL must be a full HTTP(S) API URL in AWS mode. Use .env.development.local for a local override.');
    }
    if (!['http:', 'https:'].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
      throw new Error('NEXT_PUBLIC_API_URL must be an HTTP(S) API base URL without credentials, a query, or a fragment.');
    }
    endpoint = apiUrl.href.replace(/\/+$/, '');
    const localApi = ['localhost', '127.0.0.1', '[::1]'].includes(apiUrl.hostname);
    if (localApi) {
      if (apiUrl.protocol !== 'http:' || apiUrl.pathname !== '/') {
        throw new Error('The local FastAPI server uses an HTTP root URL, for example http://localhost:8000.');
      }
      let health = await backendHealth(endpoint);
      if (!health.ready) {
        const apiPort = Number(apiUrl.port || 80);
        if (health.reachable || await portOpen(apiUrl.hostname, apiPort)) {
          throw new Error(`Port ${apiPort} is occupied but did not pass the Digital Twin health check. Check that server or select another local API port.`);
        }
        const python = findPython();
        checkBackendSetup(python);
        if (checkOnly) throw new Error('Backend setup is configured, but the API is not running. Start the explicit AWS/local mode with npm run dev.');
        message('Starting the local external Digital Twin API.');
        startOwnedChild(python.command, [
          ...python.prefix, '-m', 'uvicorn', 'server:app',
          '--host', apiUrl.hostname === '[::1]' ? '::1' : '127.0.0.1', '--port', String(apiPort),
        ], { cwd: backendDir, env: { ...process.env, PYTHONUNBUFFERED: '1' } }, 'Digital Twin API');
        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
          health = await backendHealth(endpoint);
          if (health.ready) break;
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        if (!health.ready) throw new Error('The API did not become ready within 45 seconds. Check the backend startup output above.');
      } else {
        message('Reusing the running external Digital Twin API.');
      }
      if (health.data?.llm_configured === false) {
        throw new Error('The external API is running without GROQ_API_KEY. Configure backend/.env and restart that API process.');
      }
      message('External API configuration is ready. Model requests are checked when you send a message.');
    } else {
      message('Using the explicitly configured AWS/external API; its backend is managed separately.');
    }
  }

  if (checkOnly) {
    message('Local setup check passed.');
    return;
  }
  const requestedHostname = cliValue(nextArgs, '-H', '--hostname') || '127.0.0.1';
  const probeHostname = requestedHostname === '0.0.0.0' || requestedHostname === '::' ? '127.0.0.1' : requestedHostname;
  const frontendUrl = `http://${probeHostname.includes(':') ? `[${probeHostname}]` : probeHostname}:${frontendPort}`;
  if (await portfolioRunning(frontendUrl)) {
    message(`Reusing the running portfolio at ${frontendUrl}. Restart that server after changing frontend environment variables.`);
    return;
  }
  if (await portOpen(probeHostname, frontendPort)) {
    throw new Error(`Port ${frontendPort} is occupied by another server. Choose a free port with npm run dev -- --port 3001.`);
  }
  message('Starting the portfolio.');
  const nextEnvironment = { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_DEPLOY_TARGET: target };
  if (endpoint) nextEnvironment.NEXT_PUBLIC_API_URL = endpoint;
  startOwnedChild(process.execPath, [nextBin, 'dev', ...nextArgs], {
    cwd: frontendDir,
    env: nextEnvironment,
  }, 'Portfolio frontend');
}

main().catch((error) => {
  console.error(`[dev] ${error.message}`);
  shutdown(1);
});
