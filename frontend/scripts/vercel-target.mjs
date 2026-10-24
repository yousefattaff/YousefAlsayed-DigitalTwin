import assert from 'node:assert/strict';

export function productionSite(value) {
  if (!value) return undefined;
  let site;
  try { site = new URL(value); } catch { throw new Error('Supply a valid production URL via --site=https://example.com.'); }
  const publicHost = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(site.hostname)
    && !site.hostname.endsWith('.localhost');
  assert.ok(site.protocol === 'https:' && publicHost && !site.port && !site.username && !site.password
    && site.pathname === '/' && !site.search && !site.hash, 'The production site must be a public HTTPS root URL without credentials, a port, query, or fragment.');
  return site.origin;
}

export function resolveSiteProject(site, inspected, deployment, project, domain, linked) {
  assert.match(inspected.id || '', /^dpl_[A-Za-z0-9]+$/, 'Vercel inspection did not return a deployment ID.');
  assert.equal(deployment.id, inspected.id, 'Domain inspection and deployment metadata disagree.');
  assert.match(deployment.projectId || '', /^prj_[A-Za-z0-9]+$/, 'The production deployment has no project.');
  assert.equal(project.id, deployment.projectId, 'Deployment and project metadata disagree.');
  assert.equal(project.accountId, linked.orgId, 'The domain belongs to another Vercel account/team. Link that team before deploying.');
  assert.equal(domain.name?.toLowerCase(), new URL(site).hostname, 'The requested production domain is not attached to this project.');
  assert.ok(typeof project.name === 'string' && project.name, 'Vercel returned no project name.');
  const resolved = { ...linked, projectId: project.id, projectName: project.name };
  if (project.id !== linked.projectId) delete resolved.settings;
  return resolved;
}

export function assertNativeTwinRouting(routes = []) {
  if (routes === null) return;
  assert.ok(Array.isArray(routes), 'Vercel returned unreadable routing metadata.');
  const retiredHostname = 'uvsk3twnk5.execute-api.eu-north-1.amazonaws.com';
  for (const route of routes) {
    if (typeof route?.dest !== 'string' || !/^https?:\/\//i.test(route.dest)) continue;
    const target = new URL(route.dest);
    assert.notEqual(target.hostname, retiredHostname, 'The candidate still routes requests to the retired AWS gateway. Deploy the current native Next.js configuration.');
    const redirects = route.status >= 300 && route.status < 400;
    const source = route.src || route.source || '';
    assert.ok(redirects || !source.includes('/api'), 'An external API rewrite would bypass the native Twin.');
  }
}
