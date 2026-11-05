import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadLocalTwin, verifyProviderCase } from '../scripts/verify-provider.mjs';

function runtime(answer, finishReason = 'stop') {
  const telemetry = [];
  let calls = 0;
  const twin = loadLocalTwin({ env: { GROQ_API_KEY: 'test_provider_check_dummy' },
    onTelemetry: (event) => telemetry.push(event), fetcher: async (_url, options) => {
      calls++;
      const candidates = JSON.parse(JSON.parse(options.body).messages[1].content).evidence_candidates;
      const career = candidates.find((item) => item.source === 'experience.md' && item.quote.includes('July 2026'));
      return Response.json({ choices: [{ finish_reason: finishReason, message: { content: JSON.stringify({
        decision: 'answer', passage_ids: [career.id], answer,
      }) } }], usage: { prompt_tokens: 1000, completion_tokens: 150 } });
    } });
  return { twin, telemetry, calls: () => calls };
}

test('provider preflight executes current TypeScript and checks canonical evidence in one call', async () => {
  const { twin, telemetry, calls } = runtime('I started at Arche Robotics in July 2026 as an AI intern. I work remotely on a real-time fleet-monitoring agent that detects anomalies in live robot logs.');
  assert.equal((await verifyProviderCase(twin)).status, 'passed');
  assert.equal(calls(), 1);
  assert.equal(telemetry.at(-1).reason, 'validated');
});

test('tools preflight verifies the career answer and uses its actual session, topic and history', async () => {
  const inputs = [];
  const replies = [];
  const twin = loadLocalTwin({ env: { GROQ_API_KEY: 'test_provider_check_dummy' }, fetcher: async (_url, options) => {
    const { question, evidence_candidates: candidates } = JSON.parse(JSON.parse(options.body).messages[1].content);
    const followup = question.includes('elaborate');
    const selected = candidates.find((item) => item.source === 'experience.md'
      && item.quote.includes(followup ? 'AWS Lambda' : 'July 2026'));
    return Response.json({ choices: [{ message: { content: JSON.stringify({ decision: 'answer', passage_ids: [selected.id],
      answer: followup ? 'I use Python and AWS Lambda.' : 'I started at Arche Robotics in July 2026.' }) } }] });
  } });
  const tracked = { ...twin, async chatWithTwin(input, ...rest) {
    inputs.push(input);
    const reply = await twin.chatWithTwin(input, ...rest);
    replies.push(reply);
    return reply;
  } };
  assert.equal((await verifyProviderCase(tracked, 'tools')).turns, 2);
  assert.equal(inputs.length, 2);
  assert.equal(inputs[1].session_id, replies[0].session_id);
  assert.equal(inputs[1].topic, replies[0].topic);
  assert.equal(inputs[1].history[0].content, inputs[0].message);
  assert.equal(inputs[1].history[1].content, replies[0].response);
});

test('tools preflight stops before the follow-up if the career answer has no valid evidence', async () => {
  const { twin, calls } = runtime('I have a PhD from an imaginary institution.');
  await assert.rejects(verifyProviderCase(twin, 'tools'), /returned no evidence/);
  assert.equal(calls(), 1);
});

test('provider preflight fails unsafe answers and reports the validator reason without exposing the draft', async () => {
  const { twin, telemetry } = runtime('I have a PhD from an imaginary institution.');
  await assert.rejects(verifyProviderCase(twin), /returned no evidence \(unsupported_claim\)/);
  assert.ok(!JSON.stringify(telemetry).includes('imaginary'));
});

test('local diagnostics identify rejected terms without adding them to telemetry', async () => {
  const { twin, telemetry } = runtime('I use Kubernetes.');
  const diagnostics = [];
  await assert.rejects(verifyProviderCase(twin, 'career', {
    onClaimValidation: (validation) => diagnostics.push(validation),
  }), /unsupported_claim/);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].reason, 'unsupported_facts');
  assert.deepEqual(Array.from(diagnostics[0].unsupported_terms), ['kubernetes']);
  assert.ok(!JSON.stringify(telemetry).includes('kubernetes'));
});

test('secret and unsafe replies cannot reach local claim diagnostics', async () => {
  for (const answer of ['test_provider_check_dummy', 'Authorization: Bearer private_token_value']) {
    const { twin } = runtime(answer);
    const diagnostics = [];
    await assert.rejects(verifyProviderCase(twin, 'career', {
      onClaimValidation: (validation) => diagnostics.push(validation),
    }), /unsafe_output/);
    assert.equal(diagnostics.length, 0);
  }
});

test('provider preflight distinguishes completion truncation from missing portfolio knowledge', async () => {
  const { twin, telemetry } = runtime('', 'length');
  await assert.rejects(verifyProviderCase(twin), /truncated_completion/);
  assert.equal(telemetry.at(-1).reason, 'truncated_completion');
});

test('unknown provider checks cannot trigger an API request', async () => {
  const { twin, calls } = runtime('');
  await assert.rejects(verifyProviderCase(twin, 'invalid'), /Use --case=/);
  assert.equal(calls(), 0);
});
