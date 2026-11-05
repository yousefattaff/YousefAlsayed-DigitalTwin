import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { buildEnvironment } from '../scripts/windows-environment.mjs';

test('Windows build workers receive an absolute lowercase comspec and a usable PATH', () => {
  const shell = 'C:\\Windows\\System32\\cmd.exe';
  const env = buildEnvironment({ Path: 'C:\\Tools', PATH: 'wrong-duplicate', ComSpec: shell, COMSPEC: 'bad-duplicate', SystemRoot: 'C:\\Windows' }, 'win32', (file) => file === shell);
  assert.equal(env.comspec, shell);
  assert.equal(env.PATH, 'C:\\Windows\\System32;C:\\Tools');
  assert.deepEqual(Object.keys(env).filter((key) => key.toLowerCase() === 'comspec'), ['comspec']);
  assert.deepEqual(Object.keys(env).filter((key) => key.toLowerCase() === 'path'), ['PATH']);
});

test('invalid shell settings fall back to the verified system shell and missing shells fail', () => {
  const shell = 'D:\\Windows\\System32\\cmd.exe';
  const env = buildEnvironment({ COMSPEC: 'cmd.exe', WINDIR: 'D:\\Windows' }, 'win32', (file) => file === shell);
  assert.equal(env.comspec, shell);
  assert.throws(() => buildEnvironment({}, 'win32', () => false), /command shell is missing/);
});

test('the normalized shell is usable from a real Windows worker', { skip: process.platform !== 'win32' }, () => {
  const script = `const { Worker } = require('node:worker_threads'); new Worker("const { spawnSync } = require('node:child_process'); const result = spawnSync(process.env.comspec, ['/d', '/s', '/c', 'exit 0'], { windowsHide: true }); process.exit(result.status === 0 ? 0 : 1);", { eval: true });`;
  const result = spawnSync(process.execPath, ['-e', script], { env: buildEnvironment(), windowsHide: true, encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0, result.stderr);
});
