import assert from 'node:assert/strict';
import test from 'node:test';

import { environmentSecrets, idProblems, inspectReleaseContents, inspectTextEntries, localAssetUrls, releaseFileProblems, requiredIds, secretKinds } from '../scripts/release-check.mjs';

const dummyGroq = 'gsk_' + 'a'.repeat(48);
const dummyGithub = 'ghp_' + 'b'.repeat(36);
const dummyPrivateKey = ['-----BEGIN ', 'PRIVATE KEY-----\n', 'c'.repeat(48), '\n-----END ', 'PRIVATE KEY-----'].join('');

test('secret detection reports categories without exposing any credential values', () => {
  const local = ['local', 'credential', 'without', 'a', 'provider', 'prefix'].join('-');
  const findings = inspectTextEntries([['config.ts', [dummyGroq, dummyGithub, dummyPrivateKey, local].join('\n')]], 'staged', [local]);
  assert.equal(findings.length, 1);
  for (const category of ['Groq API key', 'GitHub token', 'private key', 'local environment credential']) {
    assert.ok(findings[0].reason.includes(category));
  }
  for (const value of [dummyGroq, dummyGithub, dummyPrivateKey, local]) assert.ok(!JSON.stringify(findings).includes(value));
});

test('current and legacy Vercel token prefixes are detected without returning token values', () => {
  for (const prefix of ['vcp_', 'vct_', 'vca_', 'vercel_']) {
    const token = prefix + 'd'.repeat(40);
    const findings = inspectTextEntries([['config.ts', token]], 'source');
    assert.match(findings[0].reason, /Vercel token/);
    assert.ok(!JSON.stringify(findings).includes(token));
  }
});

test('source and deleted index files are checked against exact ignored local credentials', async () => {
  const local = ['ignored', 'local', 'credential', 'without', 'a', 'prefix'].join('-');
  const result = await inspectReleaseContents({
    candidates: ['lib/chat.ts', 'removed-handler.ts'],
    indexFiles: ['lib/chat.ts', 'removed-handler.ts'],
    localSecrets: [local],
    readSource(file) {
      if (file === 'removed-handler.ts') throw Object.assign(new Error('Missing fixture.'), { code: 'ENOENT' });
      return local;
    },
    readIndex: file => file === 'removed-handler.ts' ? local : 'const key = process.env.GROQ_API_KEY;',
  });
  assert.equal(result.sourceFiles, 1);
  assert.deepEqual(result.problems.map(problem => problem.file), ['lib/chat.ts', 'removed-handler.ts']);
  assert.match(result.problems[0].reason, /source: local environment credential/);
  assert.match(result.problems[1].reason, /Git index: local environment credential/);
  assert.ok(!JSON.stringify(result).includes(local));
});

test('intended clean deletions are allowed but an unreadable indexed blob fails inspection', async () => {
  const input = { candidates: ['removed.ts'], indexFiles: ['removed.ts'], readSource: () => null, readIndex: () => 'clean source' };
  assert.deepEqual((await inspectReleaseContents(input)).problems, []);
  input.readIndex = () => null;
  assert.match((await inspectReleaseContents(input)).problems[0].reason, /Git index content could not be read/);
});

test('a secret in the Git index is detected even when the working source has been cleaned', () => {
  assert.deepEqual(inspectTextEntries([['config.ts', 'const apiKey = process.env.GROQ_API_KEY;']], 'source'), []);
  const findings = inspectTextEntries([['config.ts', dummyGroq]], 'Git index');
  assert.equal(findings[0].file, 'config.ts');
  assert.match(findings[0].reason, /Git index: Groq API key/);
});

test('examples and ordinary identifiers are accepted without requiring an API key', () => {
  assert.deepEqual(secretKinds('GROQ_API_KEY="your_groq_api_key_here"\nNEXT_PUBLIC_DEPLOY_TARGET=vercel\nconst GROQ_API_KEY = process.env.GROQ_API_KEY;'), []);
  assert.deepEqual(inspectTextEntries([['README.md', 'Set GROQ_API_KEY in your environment.']], 'source'), []);
});

test('generic assignments distinguish token-shaped values from readable test fixture labels', () => {
  const token = ['Ab1Cd2Ef3Gh4', 'Ij5Kl6Mn7Op8', 'Qr9St0Uv1Wx2'].join('');
  assert.ok(secretKinds(`VERCEL_TOKEN="${token}"`).includes('credential assignment'));
  assert.ok(secretKinds(`AWS_SECRET_ACCESS_KEY="${token}"`).includes('credential assignment'));
  assert.deepEqual(secretKinds('GROQ_API_KEY="server-only-test-fixture"\nNEXT_PUBLIC_GROQ_API_KEY="browser-test-fixture"'), []);
  // Strong provider signatures remain forbidden regardless of a fixture filename.
  assert.ok(secretKinds(dummyGroq).includes('Groq API key'));
});

test('ignored local credentials are parsed without comments and detect exact browser leakage', () => {
  const local = ['private', 'local', 'credential', 'value'].join('-');
  const values = environmentSecrets(`export GROQ_API_KEY="${local}" # local configuration\nVERCEL_TOKEN='${local}'\nAWS_SECRET_ACCESS_KEY=${local} # comment\nNEXT_PUBLIC_DEPLOY_TARGET=vercel`);
  assert.deepEqual(values, [local, local, local]);
  const findings = inspectTextEntries([['.next/static/chunk.js', `const secretValue="${local}";`]], 'browser output', values);
  assert.match(findings[0].reason, /local environment credential/);
  assert.ok(!JSON.stringify(findings).includes(local));
});

test('missing keys and public environment examples do not require credentials for release checks', () => {
  assert.deepEqual(environmentSecrets('GROQ_API_KEY=\nGROQ_API_KEY=your_groq_api_key_here\nVERCEL_TOKEN=<replace_me>'), []);
});

test('blank credential assignments never consume following configuration or comment lines', () => {
  const local = ['private', 'local', 'credential', 'value'].join('-');
  for (const newline of ['\n', '\r\n']) {
    const source = [
      'GROQ_API_KEY=   ',
      'GROQ_MODEL=openai/gpt-oss-120b',
      'VERCEL_TOKEN= # configured in cloud settings',
      'TWIN_PRODUCTION_URL=https://yousefalsayed.me',
      `AWS_SECRET_ACCESS_KEY="${local}"`,
    ].join(newline);
    assert.deepEqual(environmentSecrets(source), [local]);
  }
});

test('environment and generated artifacts are rejected if indexed or offered for release', () => {
  const problems = releaseFileProblems({
    candidates: ['frontend/.env.local', 'frontend/.env.production.example', 'frontend/.next/output.js', 'frontend/.env.example'],
    indexFiles: ['backend/.env', 'frontend/debug.log'],
    environmentFiles: ['frontend/.env.local', 'backend/.env'],
    ignored: new Set(['frontend/.env.local', 'backend/.env']),
  });
  assert.deepEqual(problems.map(problem => problem.file), ['frontend/.env.local', 'frontend/.env.production.example',
    'frontend/.next/output.js', 'backend/.env', 'frontend/debug.log']);
});

test('private caches, Terraform state and inputs, build outputs, and Lambda archives cannot remain indexed', () => {
  const files = ['backend/.memory/chat.json', 'backend/.chroma/index.sqlite', '.codex/runs/session.json', '.agents/cache/data.json',
    '.aws/credentials', '.superpowers/logs/run.json', 'backend/infra/terraform/terraform.tfstate',
    'backend/infra/terraform/terraform.tfstate.backup', 'backend/infra/terraform/prod.tfvars', 'backend/infra/terraform/prod.tfvars.json',
    'backend/lambda-package/server.py', 'backend/deploy/lambda-deployment.zip', 'frontend/.next.zip',
    'frontend/node_modules-backup.tar.gz', 'frontend/build/index.html', 'backend/dist/twin.whl', 'coverage/lcov.info'];
  const problems = releaseFileProblems({ candidates: [], indexFiles: files, environmentFiles: [], ignored: new Set() });
  assert.deepEqual(problems.map(problem => problem.file), files);
});

test('authored public certificates and media are accepted alongside public Terraform source and examples', () => {
  const files = ['frontend/public/certificates/docker.pdf', 'frontend/public/certificates/photo.jpeg',
    'frontend/public/graduation/model.glb', 'frontend/public/projects/build/demo.mp4', 'frontend/public/projects/lambda-deployment.jpg',
    'backend/infra/terraform/main.tf', 'backend/infra/terraform/.terraform.lock.hcl', 'backend/infra/terraform/prod.tfvars.example'];
  assert.deepEqual(releaseFileProblems({ candidates: files, indexFiles: files, environmentFiles: [], ignored: new Set() }), []);
});

test('rejected private caches and archives are not opened during source or index scans', async () => {
  const files = ['lib/content.ts', 'backend/.memory/chat.json', '.local/archive.ts', 'backend/lambda-deployment.zip'];
  const sourceReads = [];
  const indexReads = [];
  const result = await inspectReleaseContents({
    candidates: files, indexFiles: files,
    readSource: file => { sourceReads.push(file); return 'clean source'; },
    readIndex: file => { indexReads.push(file); return 'clean source'; },
  });
  assert.deepEqual(sourceReads, ['lib/content.ts']);
  assert.deepEqual(indexReads, ['lib/content.ts']);
  assert.equal(result.sourceFiles, 1);
  assert.deepEqual(result.problems, []);
});

test('private environment files and ignore probes must be ignored while .env.example can ship', () => {
  const input = { candidates: ['frontend/.env.example'], indexFiles: [],
    environmentFiles: ['backend/.env', 'frontend/.env.production', 'frontend/.env.example'],
    ignoreProbes: ['frontend/.vercel/release-probe'], ignored: new Set(['backend/.env']) };
  assert.deepEqual(releaseFileProblems(input).map(problem => problem.file), ['frontend/.env.production', 'frontend/.vercel/release-probe']);
  input.ignored.add('frontend/.env.production').add('frontend/.vercel/release-probe');
  assert.deepEqual(releaseFileProblems(input), []);
});

test('all seven section IDs must occur once in real HTML attributes', () => {
  const html = requiredIds.map(id => `<section id="${id}"></section>`).join('');
  assert.deepEqual(idProblems(html), []);
  assert.match(idProblems(html + '<div id="twin"></div>')[0].reason, /#twin/);
  assert.match(idProblems(html.replace('id="skills"', 'id="other"'))[0].reason, /#skills/);
});

test('local asset discovery handles posters, queries, fragments, srcset, and optimized images', () => {
  const html = '<img src="/projects/project-placeholder.png?v=1" srcset="/projects/a.png 1x, /projects/b.png 2x">' +
    '<video src="/graduation/video.mp4" poster="/graduation/poster.jpg"></video>' +
    '<a href="/resume.pdf#view=FitH">Resume</a><a href="#twin">Twin</a>' +
    '<img src="https://other.example.com/photo.jpg"><img src="data:image/png;base64,abc">' +
    '<img src="/_next/image?url=%2Fprojects%2Foptimized.png&amp;w=640">';
  assert.deepEqual(new Set(localAssetUrls(html)), new Set(['/projects/project-placeholder.png', '/projects/a.png', '/projects/b.png',
    '/graduation/video.mp4', '/graduation/poster.jpg', '/resume.pdf', '/projects/optimized.png']));
});

test('CSS media paths resolve relative to the generated stylesheet and external URLs are skipped', () => {
  assert.deepEqual(localAssetUrls('src:url(../media/font.woff2) format("woff2"); background:url(https://cdn.example.com/photo.jpg)',
    'https://yousefalsayed.me/_next/static/chunks/style.css'), ['/_next/static/media/font.woff2']);
});

test('externally optimized images are not mistaken for missing public files', () => {
  assert.deepEqual(localAssetUrls('<img src="/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg&amp;w=640">'), []);
});
