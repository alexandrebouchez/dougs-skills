import { test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SESSION_PATH_ENV, SessionExpiredError } from '../lib/auth.mjs';
import { dougsFetch, listQuotes } from '../lib/api.mjs';

const TEST_COMPANY_ID = '999999';

let tmpDir;
let originalCwd;
beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = mkdtempSync(join(tmpdir(), 'dougs-test-'));

  // Session cookie
  const sessionPath = join(tmpDir, 'session');
  writeFileSync(sessionPath, 'connect.sid=abc123', { mode: 0o600 });
  process.env[SESSION_PATH_ENV] = sessionPath;

  // Config .claude/dougs.local.md (used by loadConfig walk-up)
  const configDir = join(tmpDir, '.claude');
  mkdirSync(configDir);
  writeFileSync(
    join(configDir, 'dougs.local.md'),
    `---\ncompany_id: "${TEST_COMPANY_ID}"\n---\n`,
  );
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
});

test('dougsFetch sends Cookie header from session file', async () => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return mockJsonResponse({ ok: true });
  };
  await dougsFetch('GET', '/users/me');
  assert.equal(calls[0].url, 'https://app.dougs.fr/users/me');
  assert.equal(calls[0].opts.headers.Cookie, 'connect.sid=abc123');
});

test('dougsFetch throws SessionExpiredError on 401', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    headers: { get: () => '' },
    text: async () => 'Unauthorized',
  });
  await assert.rejects(() => dougsFetch('GET', '/users/me'), SessionExpiredError);
});

test('dougsFetch blocks DELETE via guardrail', async () => {
  global.fetch = async () => mockJsonResponse({});
  await assert.rejects(
    () => dougsFetch('DELETE', `/companies/${TEST_COMPANY_ID}/invoicing/quotes/abc`),
    /GUARDRAIL.*DELETE.*forbidden/,
  );
});

test('dougsFetch blocks writes on /sales-invoices', async () => {
  global.fetch = async () => mockJsonResponse({});
  await assert.rejects(
    () => dougsFetch('POST', `/companies/${TEST_COMPANY_ID}/sales-invoices`, { foo: 1 }),
    /GUARDRAIL.*forbidden/,
  );
});

test('listQuotes returns parsed JSON array', async () => {
  global.fetch = async () => mockJsonResponse([{ id: 'a', subject: 'Test' }]);
  const quotes = await listQuotes();
  assert.equal(quotes.length, 1);
  assert.equal(quotes[0].subject, 'Test');
});

function mockJsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
    json: async () => body,
  };
}
