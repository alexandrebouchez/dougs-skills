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
import { readStdin } from '../lib/stdin.mjs';

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

main();
