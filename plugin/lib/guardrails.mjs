/**
 * Guardrails — fail-closed safety layer for Dougs API interactions.
 *
 * - Blocks all write operations unless explicitly whitelisted.
 * - Never allows DELETE on any endpoint.
 * - Never allows writes to invoices (sales or vendor).
 */

import { ALLOWED_WRITE_PATHS } from './config.mjs';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Paths that must NEVER accept writes, regardless of whitelist.
const BLACKLISTED_PATTERNS = [
  /sales-invoices/,
  /vendor-invoices/,
  /\/invoices(?:\/|$)/,
];

/**
 * Asserts that a given HTTP method + path combination is safe to execute.
 * Throws an Error if the operation is not allowed.
 *
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} path - API path (e.g. /companies/{id}/invoicing/quotes/uuid)
 */
export function assertSafeEndpoint(method, path) {
  const upperMethod = method.toUpperCase();

  // Reads are always allowed.
  if (!WRITE_METHODS.has(upperMethod)) {
    return;
  }

  // DELETE is never allowed on any endpoint.
  if (upperMethod === 'DELETE') {
    throw new Error(
      `[GUARDRAIL] DELETE is forbidden on all endpoints. Attempted: DELETE ${path}`
    );
  }

  // Check blacklist first — these are never writable.
  for (const pattern of BLACKLISTED_PATTERNS) {
    if (pattern.test(path)) {
      throw new Error(
        `[GUARDRAIL] Write operations are forbidden on this endpoint. Attempted: ${upperMethod} ${path}`
      );
    }
  }

  // Check whitelist — must match at least one allowed pattern.
  const isAllowed = ALLOWED_WRITE_PATHS.some((pattern) => pattern.test(path));
  if (!isAllowed) {
    throw new Error(
      `[GUARDRAIL] Endpoint not in write whitelist. Attempted: ${upperMethod} ${path}`
    );
  }
}

/**
 * Asserts that a quote object is editable (not finalized).
 * Throws an Error if the quote cannot be modified.
 *
 * @param {object} quote - Quote object with a status field.
 */
export function assertQuoteEditable(quote) {
  if (!quote || typeof quote !== 'object') {
    throw new Error('[GUARDRAIL] Invalid quote object provided.');
  }

  if (quote.status === 'FINALIZED') {
    throw new Error(
      `[GUARDRAIL] Quote ${quote.id || '(unknown)'} is FINALIZED and cannot be edited.`
    );
  }
}
