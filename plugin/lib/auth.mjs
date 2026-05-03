/**
 * Session cookie helpers for Dougs API.
 * Cookie is stored at ~/.dougs-session (perms 0600), refreshed via /dougs refresh-session.
 */

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const SESSION_PATH_ENV = 'DOUGS_SESSION_PATH';

function sessionPath() {
  return process.env[SESSION_PATH_ENV] || join(homedir(), '.dougs-session');
}

export function loadCookie() {
  const path = sessionPath();
  if (!existsSync(path)) return null;
  const content = readFileSync(path, 'utf8').trim();
  return content || null;
}

export function saveCookie(cookie) {
  const path = sessionPath();
  writeFileSync(path, cookie + '\n', { mode: 0o600 });
  chmodSync(path, 0o600);
}

export class SessionExpiredError extends Error {
  constructor(message = 'Session Dougs expirée — relance /dougs refresh-session') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}
