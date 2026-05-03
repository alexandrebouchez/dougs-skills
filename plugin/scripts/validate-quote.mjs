#!/usr/bin/env node

/**
 * validate-quote.mjs
 *
 * Validates a quote payload from stdin against structural rules.
 * Outputs "Valid" on success, or prints errors to stderr and exits 1.
 *
 * Usage:
 *   echo '{"clientData": {...}, "lines": [...], ...}' | node scripts/validate-quote.mjs
 */

import { validateQuotePayload } from '../lib/validators.mjs';

async function main() {
  const rawInput = await readStdin();

  if (!rawInput.trim()) {
    process.stderr.write('Error: No input provided. Pipe a JSON quote payload to stdin.\n');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(rawInput);
  } catch (e) {
    process.stderr.write(`Error: Invalid JSON — ${e.message}\n`);
    process.exit(1);
  }

  const result = validateQuotePayload(payload);

  if (result.valid) {
    process.stdout.write('Valid\n');
    process.exit(0);
  } else {
    process.stderr.write(`Invalid quote payload (${result.errors.length} error(s)):\n`);
    result.errors.forEach((err) => process.stderr.write(`  - ${err}\n`));
    process.exit(1);
  }
}

/**
 * Reads all of stdin as a string.
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);

    if (process.stdin.isTTY) {
      resolve('');
    }
  });
}

main();
