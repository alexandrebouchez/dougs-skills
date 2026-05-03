/**
 * Dougs API wrapper — direct fetch with session cookie.
 * All writes go through assertSafeEndpoint (lib/guardrails.mjs).
 */

import { loadCookie, SessionExpiredError } from './auth.mjs';
import { assertSafeEndpoint } from './guardrails.mjs';
import { BASE_URL, paths, loadConfig } from './config.mjs';

export { SessionExpiredError };

export async function dougsFetch(method, path, body = null) {
  assertSafeEndpoint(method, path);

  const cookie = loadCookie();
  if (!cookie) {
    throw new SessionExpiredError('No session — run /dougs:refresh-session');
  }

  const opts = {
    method,
    headers: {
      Cookie: cookie,
      Accept: 'application/json',
    },
  };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(BASE_URL + path, opts);

  if (res.status === 401) {
    throw new SessionExpiredError();
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dougs API ${method} ${path} → ${res.status}: ${text}`);
  }

  const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return res;
}

// --- High-level helpers — companyId loaded from .claude/dougs.local.md ---

export function me() {
  return dougsFetch('GET', '/users/me');
}

export function listQuotes() {
  const { companyId } = loadConfig();
  return dougsFetch('GET', paths.quotes(companyId));
}

export function getQuote(uuid) {
  const { companyId } = loadConfig();
  return dougsFetch('GET', paths.quote(uuid, companyId));
}

export function createDraft() {
  const { companyId } = loadConfig();
  return dougsFetch('POST', paths.quoteDrafts(companyId), {});
}

export function getDraft(uuid) {
  const { companyId } = loadConfig();
  return dougsFetch('GET', paths.quoteDrafts(companyId) + '/' + uuid);
}

export function updateQuote(uuid, payload) {
  const { companyId } = loadConfig();
  return dougsFetch('PUT', paths.quote(uuid, companyId), payload);
}

export function listCustomers() {
  const { companyId } = loadConfig();
  return dougsFetch('GET', paths.customers(companyId));
}

export async function downloadQuotePdf(filePath) {
  if (typeof filePath !== 'string' || !filePath.startsWith('/') || filePath.includes('://')) {
    throw new Error(`Invalid PDF path: ${filePath}`);
  }
  const cookie = loadCookie();
  if (!cookie) throw new SessionExpiredError();
  const res = await fetch(BASE_URL + filePath, {
    method: 'GET',
    headers: { Cookie: cookie },
    redirect: 'follow',
  });
  if (res.status === 401) throw new SessionExpiredError();
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
