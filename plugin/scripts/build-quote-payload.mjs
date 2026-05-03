#!/usr/bin/env node

/**
 * build-quote-payload.mjs
 *
 * Builds a complete quote payload ready for PUT to Dougs API.
 * Merges user-provided data with DEFAULTS and computes totals.
 *
 * Usage:
 *   echo '{"subject":"...", "clientData": {...}, "lines": [...]}' | node scripts/build-quote-payload.mjs
 *   node scripts/build-quote-payload.mjs --input '{"subject":"...", ...}'
 */

import { loadDefaults, DEFAULT_LINE } from '../lib/defaults.mjs';
import { validateQuotePayload } from '../lib/validators.mjs';
import { readStdin } from '../lib/stdin.mjs';

const DEFAULTS = loadDefaults();

async function main() {
  let rawInput = '';

  // Read from --input flag or stdin
  const inputFlagIndex = process.argv.indexOf('--input');
  if (inputFlagIndex !== -1 && process.argv[inputFlagIndex + 1]) {
    rawInput = process.argv[inputFlagIndex + 1];
  } else {
    rawInput = await readStdin();
  }

  if (!rawInput.trim()) {
    process.stderr.write('Error: No input provided. Pipe JSON to stdin or use --input flag.\n');
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(rawInput);
  } catch (e) {
    process.stderr.write(`Error: Invalid JSON input — ${e.message}\n`);
    process.exit(1);
  }

  // Build the payload by merging with defaults
  const payload = buildPayload(input);

  // Validate before output
  const validation = validateQuotePayload(payload);
  if (!validation.valid) {
    process.stderr.write('Validation errors:\n');
    validation.errors.forEach((err) => process.stderr.write(`  - ${err}\n`));
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
}

/**
 * Merges user input with defaults to produce a complete quote payload.
 */
function buildPayload(input) {
  // Merge lines with default line template
  const lines = (input.lines || []).map((line) => ({
    ...DEFAULT_LINE,
    ...line,
  }));

  // Compute line amounts (in cents — unitAmount is already in cents)
  const linesWithAmounts = lines.map((line) => {
    const lineDiscount = computeDiscount(
      line.unitAmount * line.quantity,
      line.discount,
      line.discountUnit
    );
    const totalHT = line.unitAmount * line.quantity - lineDiscount;
    const totalTTC = Math.round(totalHT * (1 + line.vatRate));
    return {
      ...line,
      totalHT,
      totalTTC,
    };
  });

  // Compute global totals
  const subtotalHT = linesWithAmounts.reduce((sum, l) => sum + l.totalHT, 0);
  const globalDiscount = computeDiscount(
    subtotalHT,
    input.discount ?? DEFAULTS.discount,
    input.discountUnit ?? DEFAULTS.discountUnit
  );
  const totalHT = subtotalHT - globalDiscount;
  const totalVAT = linesWithAmounts.reduce(
    (sum, l) => sum + Math.round(l.totalHT * l.vatRate),
    0
  );
  const totalTTC = totalHT + totalVAT;

  const payload = {
    // User-provided fields
    ...pickDefined(input, [
      'id',
      'status',
      'subject',
      'date',
      'expirationDate',
      'number',
      'numberPrefix',
    ]),

    // Merged defaults
    discount: input.discount ?? DEFAULTS.discount,
    discountUnit: input.discountUnit ?? DEFAULTS.discountUnit,
    thankYouNote: input.thankYouNote ?? DEFAULTS.thankYouNote,
    invoicerName: input.invoicerName ?? DEFAULTS.invoicerName,
    invoicerOthers: input.invoicerOthers ?? DEFAULTS.invoicerOthers,

    // Nested objects — deep merge
    legalData: { ...DEFAULTS.legalData, ...(input.legalData || {}) },
    footerData: { ...DEFAULTS.footerData, ...(input.footerData || {}) },
    clientData: input.clientData || {},

    // Lines (without computed totalHT/totalTTC — Dougs computes server-side)
    lines: lines,

    // Computed totals (informational — Dougs may recompute)
    _computed: {
      subtotalHT,
      globalDiscount,
      totalHT,
      totalVAT,
      totalTTC,
    },
  };

  return payload;
}

/**
 * Computes discount amount from base, rate, and unit.
 */
function computeDiscount(base, discount, discountUnit) {
  if (!discount || discount === 0) return 0;
  if (discountUnit === '%') {
    return Math.round(base * (discount / 100));
  }
  // Fixed amount discount
  return discount;
}

/**
 * Picks defined (non-undefined) keys from an object.
 */
function pickDefined(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

main();
