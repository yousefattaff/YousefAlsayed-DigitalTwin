import assert from 'node:assert/strict';
import test from 'node:test';

import { upsertVercelEnvironment, vercelJsonMutation } from '../scripts/vercel-api.mjs';

const endpoint = '/v10/projects/prj_test1/env?teamId=team_test1&upsert=true';
const environment = [
  { key: 'GROQ_API_KEY', value: 'dummy-secret-with-"quotes"-and-\\slashes', type: 'sensitive', target: ['production'] },
  { key: 'NEXT_PUBLIC_DEPLOY_TARGET', value: 'vercel', type: 'plain', target: ['production'] },
  { key: 'GROQ_MODEL', value: 'openai/gpt-oss-120b', type: 'plain', target: ['production'] },
];

async function cliRequestBody(input) {
  const parsed = JSON.parse(input);
  // Reproduce CLI 65 Client._fetch: arrays do not satisfy isJSONObject.
  const body = parsed && typeof parsed === 'object' && parsed.constructor === Object
    ? JSON.stringify(parsed) : parsed;
  return new Request('https://api.vercel.com', { method: 'POST', body }).text();
}

test('bulk root arrays reproduce Invalid JSON and are rejected before a CLI request', async () => {
  const broken = await cliRequestBody(JSON.stringify(environment));
  assert.throws(() => JSON.parse(broken), SyntaxError);
  let calls = 0;
  await assert.rejects(vercelJsonMutation(async () => { calls++; }, endpoint, 'POST', environment), /not a root array/);
  assert.equal(calls, 0);
});

test('production variables arrive as valid separate JSON objects with production scope and no secret arguments', async () => {
  const received = [];
  const uploaded = [];
  await upsertVercelEnvironment(async (args, options) => {
    assert.deepEqual(args, ['api', endpoint, '--method', 'POST', '--input', '-',
      '--header', 'Content-Type: application/json', '--silent']);
    assert.equal(options.quiet, true);
    assert.equal(options.timeoutMs, 30_000);
    assert.ok(!args.some(arg => arg.includes(environment[0].value)), 'Secrets must travel through stdin only.');
    received.push(JSON.parse(await cliRequestBody(options.input)));
  }, endpoint, environment, name => uploaded.push(name));
  assert.deepEqual(received, environment);
  assert.deepEqual(uploaded, environment.map(variable => variable.key));
});

test('a failed environment write stops subsequent writes and records only completed variables', async () => {
  const calls = [];
  const uploaded = [];
  await assert.rejects(upsertVercelEnvironment(async (_args, options) => {
    const variable = JSON.parse(options.input);
    calls.push(variable.key);
    if (variable.key === 'NEXT_PUBLIC_DEPLOY_TARGET') throw new Error('API rejected the update');
  }, endpoint, environment, name => uploaded.push(name)), /NEXT_PUBLIC_DEPLOY_TARGET: API rejected/);
  assert.deepEqual(calls, ['GROQ_API_KEY', 'NEXT_PUBLIC_DEPLOY_TARGET']);
  assert.deepEqual(uploaded, ['GROQ_API_KEY']);
});

test('invalid variable entries are rejected before any production configuration is changed', async () => {
  for (const invalid of [null, [], 'text', { value: 'no-key' }]) {
    let calls = 0;
    await assert.rejects(upsertVercelEnvironment(async () => { calls++; }, endpoint, [environment[0], invalid]));
    assert.equal(calls, 0);
  }
});

test('project settings preserve a null output directory and JSON values without shell escaping', async () => {
  const settings = { framework: 'nextjs', outputDirectory: null, buildCommand: 'npm run build' };
  await vercelJsonMutation(async (args, options) => {
    assert.equal(args[3], 'PATCH');
    assert.deepEqual(JSON.parse(await cliRequestBody(options.input)), settings);
  }, '/v9/projects/prj_test1?teamId=team_test1', 'PATCH', settings);
});
