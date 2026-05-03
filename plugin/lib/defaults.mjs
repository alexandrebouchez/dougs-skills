/**
 * Default template values for Dougs quotes.
 * Reads invoicer info (legal, contact, branding) from .claude/dougs.local.md
 * sections (## Invoicer Name, ## Legal Information, etc.).
 */

import { readFileSync } from 'node:fs';
import { loadConfig } from './config.mjs';

let cachedDefaults = null;

function readBody(path) {
  const content = readFileSync(path, 'utf8');
  const m = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return m ? m[1].trim() : '';
}

function parseSection(body, sectionName) {
  const lines = body.split('\n');
  const headingRe = new RegExp(`^##\\s+${sectionName}\\s*$`);
  const nextHeadingRe = /^##\s/;
  let inSection = false;
  const collected = [];
  for (const line of lines) {
    if (headingRe.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && nextHeadingRe.test(line)) break;
    if (inSection) collected.push(line);
  }
  return collected.join('\n').trim();
}

export function loadDefaults() {
  if (cachedDefaults) return cachedDefaults;
  const cfg = loadConfig();
  const body = readBody(cfg.configPath);

  const invoicerName = parseSection(body, 'Invoicer Name') || 'My Company';
  const invoicerOthers = parseSection(body, 'Invoicer Others')
    .split('\n')
    .map((s) => s.replace(/^-\s*/, '').trim())
    .filter(Boolean);
  const legalInformation =
    parseSection(body, 'Legal Information') ||
    'My Company\n[Configure in .claude/dougs.local.md]';
  const contactInformation =
    parseSection(body, 'Contact Information') ||
    '[Configure in .claude/dougs.local.md]';
  const thankYouNote =
    parseSection(body, 'Thank You Note') || 'Thank you for your trust!';
  const paymentTerms = parseSection(body, 'Payment Terms') || 'à réception';
  const latePaymentTerms =
    parseSection(body, 'Late Payment Terms') ||
    "Des pénalités de retard au taux de 3 fois le taux d'intérêt légal seront appliquées en cas de non-paiement à la date d'échéance.";

  cachedDefaults = {
    invoicerName,
    invoicerOthers,
    thankYouNote,
    discountUnit: '%',
    discount: 0,
    legalData: { paymentTerms, latePaymentTerms },
    footerData: {
      legalInformation,
      contactInformation,
      isGeneratedWithCompleteData: true,
      others: [],
    },
  };
  return cachedDefaults;
}

/**
 * Default line item template.
 */
export const DEFAULT_LINE = {
  description: '',
  unit: 'unité',
  quantity: 1,
  vatRate: 0.2,
  discount: 0,
  discountUnit: '%',
  reference: '',
  amount: 0,
  discountInEuros: 0,
  isPriceWithVat: false,
};
