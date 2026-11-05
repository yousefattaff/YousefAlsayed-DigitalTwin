import fs from 'node:fs/promises';
import { productionSite } from './vercel-target.mjs';
import { publicTwinTransport, readPortfolioSources, verifyTwin } from './twin-verification.mjs';

const report = { startedAt: new Date().toISOString(), status: 'running', site: null, checks: [] };
try {
  report.site = productionSite(process.argv.find((value) => value.startsWith('--site='))?.slice(7));
  if (!report.site) throw new Error('Supply --site=https://yousefalsayed.me to verify the deployed Twin.');
  const policy = JSON.parse(await fs.readFile(new URL('../data/twin/guardrails.json', import.meta.url), 'utf8'));
  await verifyTwin({
    request: publicTwinTransport(report.site), sources: await readPortfolioSources(), policyVersion: policy.version,
    checks: report.checks, pace: 65_000, onCheck: (check) => console.log(`[live] PASS ${check.name}`),
    onRetry: (name) => console.log(`[live] Retrying ${name} after a provider or token-limit pause.`),
  });
  report.status = 'passed';
  console.log(`[live] PASSED ${report.checks.length} checks against ${report.site}. Friendly bilingual replies, refusals, and canonical supporting evidence verified.`);
} catch (error) {
  report.status = 'failed';
  // Reports contain public verified quotes and safe failure descriptions, never keys or raw API bodies.
  report.error = error.message;
  const networkCode = error.cause?.cause?.code || error.cause?.code;
  if (networkCode) report.networkCode = networkCode;
  console.error(`[live] FAILED ${report.error}${networkCode ? ` (${networkCode})` : ''}`);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  const directory = new URL('../.vercel/', import.meta.url);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(new URL('twin-live-verification.json', directory), `${JSON.stringify(report, null, 2)}\n`);
}
