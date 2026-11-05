import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readPortfolioSources, verifyEvidenceReply } from './twin-verification.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const careerQuestion = 'When did you start at Arche Robotics, and what do you work on there?';
const cases = {
  career: { message: careerQuestion, source: 'experience.md', facts: /July 2026/ },
  tools: { message: 'Can you elaborate on the AI tools you use there?',
    source: 'experience.md', facts: /Python|FastMCP|Groq|DynamoDB|AWS/ },
  graduation: { message: 'Was your graduation service robot ROS1 or ROS2, and what hardware did it use?',
    source: 'achievements.md', facts: /ROS2[\s\S]*Jetson|Jetson[\s\S]*ROS2/ },
  arabic: { message: 'بتستخدم إيه في شغلك في Arche Robotics؟', source: 'experience.md', facts: /Python|Groq|FastMCP|AWS/ },
  script: { message: 'Can you show me a python script of how you used DynamoDB Streams?',
    source: 'experience.md', facts: /DynamoDB Stream/, allowCode: true },
  robotics: { message: 'Did your robot calculate obstacle distances with LIDAR on Ubuntu?',
    source: 'achievements.md', facts: /ROS2[\s\S]*Jetson|Jetson[\s\S]*ROS2/ },
};

// Execute the same server service against the real provider before spending time
// on a Vercel build. Only these local, trusted modules can enter the VM loader.
export function loadLocalTwin({ env = process.env, fetcher = fetch, onTelemetry = () => {} } = {}) {
  const modules = {
    'server-only': {}, 'node:fs': fs, 'node:path': path, 'node:crypto': require('node:crypto'),
    '@/data/twin/guardrails.json': JSON.parse(fs.readFileSync(path.join(frontend, 'data/twin/guardrails.json'), 'utf8')),
  };
  for (const name of ['content', 'guardrails', 'twin']) {
    const filename = path.join(frontend, `lib/${name}.ts`);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    const exports = {};
    vm.runInNewContext(code, {
      exports, require(id) { assert.ok(Object.hasOwn(modules, id), 'Unexpected service dependency.'); return modules[id]; },
      process: { cwd: () => frontend, env }, fetch: fetcher,
      Response, AbortController, TextDecoder, Buffer, Date, setTimeout, clearTimeout,
      console: { log: console.log, error: console.error, info(line) { onTelemetry(JSON.parse(line)); } },
    }, { filename });
    modules[`@/lib/${name}`] = exports;
  }
  return modules['@/lib/twin'];
}

export async function verifyProviderCase(twin, name = 'career', diagnostics) {
  assert.ok(Object.hasOwn(cases, name), 'Use --case=career, tools, graduation, arabic, script, or robotics.');
  const sources = await readPortfolioSources();
  const ask = async (caseName, context = {}) => {
    const { message, source, facts, allowCode = false } = cases[caseName];
    const reply = await twin.chatWithTwin(twin.validateChatInput({ message, ...context }), undefined, diagnostics);
    verifyEvidenceReply(reply, sources, { allowCode });
    if (allowCode) assert.ok(/```python\b/.test(reply.response), 'The requested Python example was missing.');
    assert.ok(reply.evidence.some((item) => item.source === source && facts.test(item.quote)), 'The selected evidence does not answer this provider check.');
    return reply;
  };
  let context;
  if (name === 'tools') {
    const first = await ask('career');
    context = {
      session_id: first.session_id, topic: first.topic,
      history: [{ role: 'user', content: careerQuestion }, { role: 'assistant', content: first.response }],
    };
  }
  const reply = await ask(name, context);
  return { status: 'passed', case: name, turns: name === 'tools' ? 2 : 1,
    reply_kind: reply.reply_kind, evidence_count: reply.evidence.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv.find((arg) => arg.startsWith('--case='))?.slice(7) || 'career';
  const report = { startedAt: new Date().toISOString(), case: Object.hasOwn(cases, name) ? name : 'invalid', status: 'running', telemetry: [] };
  let twin;
  try {
    // Load server credentials without printing values or placing them in arguments.
    require('@next/env').loadEnvConfig(frontend, false, { info() {}, warn() {}, error() {} });
    twin = loadLocalTwin({ onTelemetry: (event) => report.telemetry.push(event) });
    Object.assign(report, await verifyProviderCase(twin, name, {
      onClaimValidation(validation) {
        if (!validation.supported) report.validation = validation;
      },
    }));
    console.log(`[provider] PASS ${name}: provider response handling and canonical evidence verified.`);
  } catch (error) {
    report.status = 'failed';
    // Only service codes or our fixed assertion messages are safe to display.
    report.error = twin && error instanceof twin.TwinError ? error.code
      : error.code === 'ERR_ASSERTION' ? error.message : 'Provider check could not run; check network access and local configuration.';
    console.error(`[provider] FAIL ${report.error}`);
    process.exitCode = 1;
  } finally {
    report.finishedAt = new Date().toISOString();
    const directory = path.join(frontend, '.vercel');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'twin-provider-check.json'), `${JSON.stringify(report, null, 2)}\n`);
    for (const event of report.telemetry) console.log(`[provider] ${JSON.stringify(event)}`);
    if (report.validation) console.log(`[provider] validation: ${JSON.stringify(report.validation)}`);
  }
}
