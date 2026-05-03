/**
 * Dougs plugin configuration.
 * Reads company_id and other per-project settings from .claude/dougs.local.md
 * found by walking up the directory tree from cwd. Throws if not configured.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

let cachedConfig = null;
let cachedCwd = null;
let lastLoggedPath = null;

export function clearConfigCache() {
  cachedConfig = null;
  cachedCwd = null;
  lastLoggedPath = null;
}

function findLocalMd(startDir = process.cwd()) {
  let dir = resolve(startDir);
  const root = resolve('/');
  const home = resolve(homedir());
  while (dir !== root) {
    const candidate = join(dir, '.claude', 'dougs.local.md');
    if (existsSync(candidate)) return candidate;
    if (dir === home) break; // stop at homedir — never walk above
    dir = dirname(dir);
  }
  return null;
}

/**
 * Read a UTF-8 text file with BOM and CRLF normalization.
 * Windows editors (Notepad, etc.) commonly emit BOM + CRLF, which would otherwise
 * silently break the frontmatter / section regexes.
 */
export function readNormalizedFile(path) {
  return readFileSync(path, 'utf8')
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n');
}

export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-z_][a-z0-9_]*):\s*(.*)$/i);
    if (!m) continue;
    let [, key, value] = m;
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = parseFloat(value);
    result[key] = value;
  }
  return result;
}

export function loadConfig() {
  const cwd = process.cwd();
  if (cachedConfig && cachedCwd === cwd) return cachedConfig;
  const path = findLocalMd(cwd);
  if (!path) {
    throw new Error(
      'Dougs not configured. Run `npx @drivenlabs/dougs` to set up, ' +
        'or create .claude/dougs.local.md manually (see template).',
    );
  }
  const content = readNormalizedFile(path);
  const cfg = parseFrontmatter(content);
  if (!cfg.company_id) {
    throw new Error(
      `Missing company_id in ${path}. Run setup wizard or fix manually.`,
    );
  }

  if (lastLoggedPath !== path && process.env.DOUGS_QUIET !== '1') {
    process.stderr.write(`[dougs] Using config: ${path}\n`);
    lastLoggedPath = path;
  }

  cachedConfig = {
    companyId: String(cfg.company_id),
    defaultVatRate: cfg.default_vat_rate ?? 0.2,
    defaultUnit: cfg.default_unit ?? 'unité',
    defaultExpirationDays: cfg.default_expiration_days ?? 30,
    configPath: path,
  };
  cachedCwd = cwd;
  return cachedConfig;
}

// --- Constants ---

export const BASE_URL = 'https://app.dougs.fr';

// --- API path builders (companyId required, comes from loadConfig()) ---

export const paths = {
  quotes: (companyId) => `/companies/${companyId}/invoicing/quotes`,
  quote: (uuid, companyId) => `/companies/${companyId}/invoicing/quotes/${uuid}`,
  quoteDrafts: (companyId) => `/companies/${companyId}/invoicing/quote-drafts`,
  customers: (companyId) => `/companies/${companyId}/customers`,
  salesInvoices: (companyId) => `/companies/${companyId}/sales-invoices`,
  vendorInvoices: (companyId) => `/companies/${companyId}/vendor-invoices`,
};

// --- Write-safe endpoint whitelist (regex patterns) ---

export const ALLOWED_WRITE_PATHS = [
  /^\/companies\/\d+\/invoicing\/quotes(\/[a-f0-9-]+)?$/,
  /^\/companies\/\d+\/invoicing\/quote-drafts$/,
];
