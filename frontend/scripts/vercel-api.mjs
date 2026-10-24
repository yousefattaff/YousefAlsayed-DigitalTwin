import assert from 'node:assert/strict';

function jsonObjectInput(payload) {
  const input = JSON.stringify(payload);
  const parsed = input === undefined ? undefined : JSON.parse(input);
  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed),
    'Vercel API mutations require a JSON object, not a root array or scalar.');
  return input;
}

export async function vercelJsonMutation(cli, endpoint, method, payload) {
  return cli(['api', endpoint, '--method', method, '--input', '-',
    '--header', 'Content-Type: application/json', '--silent'], {
    quiet: true,
    input: jsonObjectInput(payload),
    timeoutMs: 30_000,
  });
}

export async function upsertVercelEnvironment(cli, endpoint, environment, onUploaded = () => {}) {
  assert.ok(Array.isArray(environment), 'Supply the production environment as a list of variables.');
  // Validate the whole list before starting any remote writes.
  for (const variable of environment) {
    jsonObjectInput(variable);
    assert.ok(typeof variable.key === 'string' && variable.key.trim(), 'Each environment variable needs a key.');
  }
  for (const variable of environment) {
    try {
      // CLI 65 parses stdin, but its HTTP serializer only stringifies objects.
      // A bulk root array becomes "[object Object],..." and gets HTTP 400.
      await vercelJsonMutation(cli, endpoint, 'POST', variable);
    } catch (error) {
      throw new Error(`Production environment update failed for ${variable.key}: ${error.message}`, { cause: error });
    }
    onUploaded(variable.key);
  }
}
