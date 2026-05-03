import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCookie, saveCookie, SESSION_PATH_ENV } from '../lib/auth.mjs';

test('loadCookie returns null when file missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dougs-'));
  process.env[SESSION_PATH_ENV] = join(dir, 'no-such-file');
  assert.equal(loadCookie(), null);
  rmSync(dir, { recursive: true });
});

test('saveCookie writes file with 0600 perms', { skip: process.platform === 'win32' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'dougs-'));
  const path = join(dir, 'session');
  process.env[SESSION_PATH_ENV] = path;
  saveCookie('session=abc; other=xyz');
  const content = readFileSync(path, 'utf8').trim();
  assert.equal(content, 'session=abc; other=xyz');
  const mode = statSync(path).mode & 0o777;
  assert.equal(mode, 0o600);
  rmSync(dir, { recursive: true });
});

test('saveCookie writes file content (Windows-compatible)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dougs-'));
  const path = join(dir, 'session');
  process.env[SESSION_PATH_ENV] = path;
  saveCookie('session=abc');
  assert.equal(readFileSync(path, 'utf8').trim(), 'session=abc');
  rmSync(dir, { recursive: true });
});

test('loadCookie returns trimmed cookie string', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dougs-'));
  const path = join(dir, 'session');
  writeFileSync(path, '  session=abc  \n', { mode: 0o600 });
  process.env[SESSION_PATH_ENV] = path;
  assert.equal(loadCookie(), 'session=abc');
  rmSync(dir, { recursive: true });
});
