/**
 * Dougs API wrapper — direct fetch with session cookie.
 * All writes go through assertSafeEndpoint (lib/guardrails.mjs).
 */

import { loadCookie, SessionExpiredError } from './auth.mjs';
import { assertSafeEndpoint } from './guardrails.mjs';
import { BASE_URL, paths, loadConfig } from './config.mjs';

export { SessionExpiredError };

const DEFAULT_TIMEOUT_MS = 15_000;

async function timedFetch(url, opts = {}) {
  const signal = opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(`Dougs request timed out after ${DEFAULT_TIMEOUT_MS}ms (${url})`);
    }
    const cause = err.cause?.message || err.message;
    throw new Error(`Network error reaching app.dougs.fr: ${cause}`);
  }
}

export async function dougsFetch(method, path, body = null) {
  assertSafeEndpoint(method, path);

  const cookie = loadCookie();
  if (!cookie) {
    throw new SessionExpiredError('No session — run /dougs refresh-session');
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

  const res = await timedFetch(BASE_URL + path, opts);

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
  // Non-JSON response on a JSON endpoint usually means Dougs returned an HTML
  // maintenance page or an unexpected gateway response. Surface it loudly.
  throw new Error(
    `Dougs returned non-JSON (status ${res.status}, content-type "${ct}"). Service may be down or session expired.`,
  );
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

/**
 * Download a quote PDF. The path comes from the Dougs API (quote.file.path).
 * Validates the path is a same-origin absolute path, follows redirects manually
 * to ensure the session cookie never crosses origin.
 */
export async function downloadQuotePdf(filePath) {
  if (
    typeof filePath !== 'string' ||
    !filePath.startsWith('/') ||
    filePath.startsWith('//') ||
    filePath.includes('://')
  ) {
    throw new Error(`Invalid PDF path: ${filePath}`);
  }
  const cookie = loadCookie();
  if (!cookie) throw new SessionExpiredError();

  let url = BASE_URL + filePath;
  for (let hop = 0; hop < 5; hop++) {
    const res = await timedFetch(url, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'manual',
    });
    if (res.status === 401) throw new SessionExpiredError();
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error(`PDF redirect with no Location header (status ${res.status})`);
      const next = new URL(location, url);
      if (next.origin !== new URL(BASE_URL).origin) {
        throw new Error(
          `Refusing to follow PDF redirect to ${next.origin} (cookie stays same-origin).`,
        );
      }
      url = next.toString();
      continue;
    }
    if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('PDF download: too many redirects (>5)');
}
