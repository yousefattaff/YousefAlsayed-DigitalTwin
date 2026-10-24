import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const testRoot = fileURLToPath(new URL('./', import.meta.url));
const script = fs.readFileSync(new URL('../scripts/sync-content.mjs', import.meta.url), 'utf8');

function write(root, relative, contents) {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, contents);
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(testRoot, '.sync-content-tests-'));
  t.after(() => {
    const relative = path.relative(testRoot, fs.realpathSync(root));
    assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    fs.rmSync(root, { recursive: true, force: true });
  });
  write(root, 'frontend/scripts/sync-content.mjs', script);
  write(root, 'frontend/data/twin/facts.json', '{"name":"Fixture"}');
  write(root, 'frontend/data/twin/summary.txt', 'Fixture profile.');
  write(root, 'frontend/data/twin/style.txt', 'Use a direct voice.');
  return root;
}

function sync(root) {
  return spawnSync(process.execPath, [path.join(root, 'frontend/scripts/sync-content.mjs')], {
    cwd: path.join(root, 'frontend'), encoding: 'utf8', timeout: 5_000,
  });
}

test('synchronization removes obsolete bundled Markdown while preserving source and other files', (t) => {
  const root = fixture(t);
  write(root, 'content/profile.md', 'Current profile.');
  write(root, 'content/projects/current.md', 'Current project.');
  write(root, 'content/source.pdf', 'Source archive.');
  write(root, 'frontend/content/profile.md', 'Old profile.');
  write(root, 'frontend/content/projects/obsolete.md', 'Removed career claim.');
  write(root, 'frontend/content/notes.txt', 'Local non-Markdown file.');
  const result = sync(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/profile.md'), 'utf8'), 'Current profile.');
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/projects/current.md'), 'utf8'), 'Current project.');
  assert.equal(fs.existsSync(path.join(root, 'frontend/content/projects/obsolete.md')), false);
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/notes.txt'), 'utf8'), 'Local non-Markdown file.');
  assert.equal(fs.readFileSync(path.join(root, 'content/source.pdf'), 'utf8'), 'Source archive.');
  assert.equal(fs.existsSync(path.join(root, 'frontend/content/source.pdf')), false);
  assert.equal(fs.readFileSync(path.join(root, 'content/profile.md'), 'utf8'), 'Current profile.');
});

test('renaming and then deleting a canonical project removes both old bundle paths', (t) => {
  const root = fixture(t);
  write(root, 'content/profile.md', 'Current profile.');
  write(root, 'content/projects/old.md', 'Project to rename.');
  assert.equal(sync(root).status, 0);
  fs.renameSync(path.join(root, 'content/projects/old.md'), path.join(root, 'content/projects/new.md'));
  assert.equal(sync(root).status, 0);
  assert.equal(fs.existsSync(path.join(root, 'frontend/content/projects/old.md')), false);
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/projects/new.md'), 'utf8'), 'Project to rename.');
  fs.unlinkSync(path.join(root, 'content/projects/new.md'));
  assert.equal(sync(root).status, 0);
  assert.equal(fs.existsSync(path.join(root, 'frontend/content/projects/new.md')), false);
  assert.equal(fs.readFileSync(path.join(root, 'content/profile.md'), 'utf8'), 'Current profile.');
});

test('standalone frontend synchronization keeps its bundled knowledge without root content', (t) => {
  const root = fixture(t);
  write(root, 'frontend/content/profile.md', 'Standalone profile.');
  write(root, 'frontend/content/projects/current.md', 'Standalone project.');
  const result = sync(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/profile.md'), 'utf8'), 'Standalone profile.');
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/projects/current.md'), 'utf8'), 'Standalone project.');
  assert.equal(fs.readFileSync(path.join(root, 'frontend/data/twin/facts.json'), 'utf8'), '{"name":"Fixture"}');
});

test('an incomplete canonical source fails before replacing or pruning bundled content', (t) => {
  const root = fixture(t);
  write(root, 'content/partial.md', 'Incomplete upload.');
  write(root, 'frontend/content/profile.md', 'Previous complete profile.');
  write(root, 'frontend/content/projects/current.md', 'Previous complete project.');
  const result = sync(root);
  assert.notEqual(result.status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/profile.md'), 'utf8'), 'Previous complete profile.');
  assert.equal(fs.readFileSync(path.join(root, 'frontend/content/projects/current.md'), 'utf8'), 'Previous complete project.');
  assert.equal(fs.existsSync(path.join(root, 'frontend/content/partial.md')), false);
});

test('linked destinations are rejected before copies or deletions can reach outside content', async (t) => {
  for (const linkedRoot of [false, true]) {
    await t.test(linkedRoot ? 'linked content root' : 'linked subdirectory', (t) => {
      const root = fixture(t);
      write(root, 'content/profile.md', 'Current profile.');
      write(root, 'content/projects/current.md', 'Current project.');
      write(root, 'outside/current.md', 'Outside marker.');
      write(root, 'outside/obsolete.md', 'Outside old marker.');
      const destination = path.join(root, linkedRoot ? 'frontend/content' : 'frontend/content/projects');
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      try {
        fs.symlinkSync(path.join(root, 'outside'), destination, process.platform === 'win32' ? 'junction' : 'dir');
      } catch (error) {
        if (['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP'].includes(error.code)) {
          t.skip('Directory links are unavailable in this environment.');
          return;
        }
        throw error;
      }
      const result = sync(root);
      assert.notEqual(result.status, 0);
      assert.equal(fs.readFileSync(path.join(root, 'outside/current.md'), 'utf8'), 'Outside marker.');
      assert.equal(fs.readFileSync(path.join(root, 'outside/obsolete.md'), 'utf8'), 'Outside old marker.');
      assert.equal(fs.existsSync(path.join(root, 'outside/profile.md')), false);
    });
  }
});
