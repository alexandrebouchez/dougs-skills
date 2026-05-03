/**
 * Validators — structural validation for quote payloads before submission.
 */

const VALID_VAT_RATES = new Set([0, 0.055, 0.1, 0.2]);

/**
 * Validates a quote payload for structural correctness.
 *
 * @param {object} payload - The quote object to validate.
 * @returns {{ valid: boolean, errors?: string[] }}
 */
export function validateQuotePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be a non-null object.'] };
  }

  // --- clientData ---
  if (!payload.clientData || typeof payload.clientData !== 'object') {
    errors.push('clientData is required and must be an object.');
  } else {
    if (!payload.clientData.legalName || typeof payload.clientData.legalName !== 'string' || payload.clientData.legalName.trim() === '') {
      errors.push('clientData.legalName must be a non-empty string.');
    }
  }

  // --- date ---
  if (!isValidISODate(payload.date)) {
    errors.push('date must be a valid ISO date string (YYYY-MM-DD or full ISO).');
  }

  // --- expirationDate ---
  if (!isValidISODate(payload.expirationDate)) {
    errors.push('expirationDate must be a valid ISO date string (YYYY-MM-DD or full ISO).');
  }

  // --- expirationDate > date ---
  if (isValidISODate(payload.date) && isValidISODate(payload.expirationDate)) {
    const d = new Date(payload.date);
    const exp = new Date(payload.expirationDate);
    if (exp <= d) {
      errors.push('expirationDate must be strictly after date.');
    }
  }

  // --- lines ---
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    errors.push('lines must be a non-empty array.');
  } else {
    payload.lines.forEach((line, i) => {
      const prefix = `lines[${i}]`;

      if (!line.title || typeof line.title !== 'string' || line.title.trim() === '') {
        errors.push(`${prefix}.title must be a non-empty string.`);
      }

      if (typeof line.quantity !== 'number' || line.quantity <= 0) {
        errors.push(`${prefix}.quantity must be a number > 0.`);
      }

      if (typeof line.unitAmount !== 'number' || line.unitAmount < 0) {
        errors.push(`${prefix}.unitAmount must be a number >= 0.`);
      }

      if (!VALID_VAT_RATES.has(line.vatRate)) {
        errors.push(`${prefix}.vatRate must be one of: 0, 0.055, 0.1, 0.2. Got: ${line.vatRate}`);
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Checks if a string is a valid ISO date (parseable by Date constructor
 * and not NaN).
 */
function isValidISODate(value) {
  if (!value || typeof value !== 'string') return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}
