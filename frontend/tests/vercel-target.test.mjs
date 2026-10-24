import assert from 'node:assert/strict';
import test from 'node:test';

import { assertNativeTwinRouting, productionSite, resolveSiteProject } from '../scripts/vercel-target.mjs';

const site = 'https://yousefalsayed.me';
const linked = { orgId: 'team_owner1', projectId: 'prj_old1', projectName: 'old-project', settings: { outputDirectory: 'out' } };
const inspected = { id: 'dpl_live1', name: 'portfolio', url: 'portfolio.vercel.app', aliases: ['yousefalsayed.me'], readyState: 'READY' };
const deployment = { id: 'dpl_live1', projectId: 'prj_native2' };
const project = { id: 'prj_native2', name: 'portfolio', accountId: 'team_owner1' };
const domain = { name: 'yousefalsayed.me' };

test('production verification uses a normalized public HTTPS root URL', () => {
  assert.equal(productionSite('https://YousefAlsayed.me/'), site);
  assert.equal(productionSite(undefined), undefined);
  assert.equal(productionSite('https://portfolio-example.vercel.app'), 'https://portfolio-example.vercel.app');
});

test('production target URLs reject credentials, local hosts, paths, and non-HTTPS requests', () => {
  for (const value of ['http://yousefalsayed.me', 'https://localhost', 'https://test.localhost', 'https://127.0.0.1', 'https://[::1]',
    'https://name:secret@yousefalsayed.me', 'https://yousefalsayed.me:8443', 'https://yousefalsayed.me/api/chat',
    'https://yousefalsayed.me/?token=value', 'https://yousefalsayed.me/#contact', 'invalid']) {
    assert.throws(() => productionSite(value));
  }
});

test('CLI 65 inspection plus REST metadata selects the existing custom-domain project in the linked team', () => {
  assert.equal(inspected.projectId, undefined, 'CLI 65 inspection omits projectId; REST metadata supplies it.');
  const resolved = resolveSiteProject(site, inspected, deployment, project, domain, linked);
  assert.equal(resolved.projectId, 'prj_native2');
  assert.equal(resolved.projectName, 'portfolio');
  assert.equal(resolved.orgId, linked.orgId);
  assert.equal(resolved.settings, undefined, 'Old project settings must not follow a different project.');
  assert.equal(linked.settings.outputDirectory, 'out', 'Project resolution does not mutate the original link.');
});

test('an unrelated account cannot receive the deployment or server key', () => {
  assert.throws(() => resolveSiteProject(site, inspected, deployment, { ...project, accountId: 'team_other2' }, domain, linked), /another Vercel account\/team/);
});

test('mismatched deployment, project, or domain metadata is rejected before linking', () => {
  assert.throws(() => resolveSiteProject(site, inspected, { ...deployment, id: 'dpl_other2' }, project, domain, linked), /metadata disagree/);
  assert.throws(() => resolveSiteProject(site, inspected, deployment, { ...project, id: 'prj_other3' }, domain, linked), /metadata disagree/);
  assert.throws(() => resolveSiteProject(site, inspected, deployment, project, { name: 'another.example.com' }, linked), /not attached/);
  assert.throws(() => resolveSiteProject(site, { ...inspected, id: '../other' }, deployment, project, domain, linked), /deployment ID/);
});

test('the retired AWS rewrite responsible for the reported proxy DNS failure cannot be promoted', () => {
  const oldRoutes = [{ src: '/api/(.*)', dest: 'https://uvsk3twnk5.execute-api.eu-north-1.amazonaws.com/$1' }];
  assert.throws(() => assertNativeTwinRouting(oldRoutes), /retired AWS gateway/);
});

test('native API routes and unrelated static assets pass the routing check', () => {
  assert.doesNotThrow(() => assertNativeTwinRouting([
    { src: '/api/chat', dest: '/api/chat' }, { src: '/api/health', dest: '/api/health' },
    { src: '/assets/(.*)', dest: 'https://cdn.example.com/$1' },
  ]));
  assert.doesNotThrow(() => assertNativeTwinRouting());
  assert.doesNotThrow(() => assertNativeTwinRouting(null));
});

test('API proxy rewrites are rejected while ordinary domain redirects remain allowed', () => {
  assert.throws(() => assertNativeTwinRouting([{ src: '/api/(.*)', dest: 'https://api.example.com/$1' }]), /bypass the native Twin/);
  assert.doesNotThrow(() => assertNativeTwinRouting([{ src: '/api/(.*)', dest: 'https://www.example.com/api/$1', status: 308 }]));
});
