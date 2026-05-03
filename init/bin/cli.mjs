#!/usr/bin/env node
/**
 * @drivenlabs/dougs — interactive setup wizard for the dougs Claude Code plugin.
 *
 * 1. Detects `claude` CLI; if available, adds the marketplace and installs the plugin.
 * 2. Prompts for company info (company_id, legal mentions, contact).
 * 3. Writes .claude/dougs.local.md in the current project (no overwrite without confirm).
 *
 * Zero npm dependencies. Supports both TTY (interactive) and piped stdin (CI/test).
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'alexandrebouchez/dougs-skills';
const MARKETPLACE = 'dougs-skills';
const PLUGIN_NAME = 'dougs';

let rl = null;
let bufferedLines = null;
let bufferIndex = 0;

if (input.isTTY) {
  rl = createInterface({ input, output });
} else {
  // Non-TTY (piped input) — read everything upfront to avoid readline EOF race.
  const raw = readFileSync(0, 'utf-8');
  bufferedLines = raw.split('\n');
}

async function readLine() {
  if (bufferedLines !== null) {
    const line = bufferedLines[bufferIndex++] ?? '';
    output.write(line + '\n');
    return line;
  }
  return rl.question('');
}

function prompt(text) {
  output.write(text);
}

async function ask(q, def = '') {
  const suffix = def ? ` [${def}]` : '';
  prompt(`${q}${suffix}: `);
  const ans = (await readLine()).trim();
  return ans || def;
}

async function askBool(q, def = true) {
  const suffix = def ? ' [Y/n]' : ' [y/N]';
  prompt(`${q}${suffix}: `);
  const ans = (await readLine()).trim().toLowerCase();
  if (!ans) return def;
  return ans.startsWith('y') || ans === 'o' || ans === 'oui';
}

function close() {
  if (rl) rl.close();
}

function hasClaudeCli() {
  try {
    execSync('claude --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function escapeQuotes(s) {
  return String(s).replace(/"/g, '\\"');
}

async function main() {
  console.log('');
  console.log('  ┌──────────────────────────────────────────┐');
  console.log('  │  dougs Claude Code plugin — setup wizard │');
  console.log('  └──────────────────────────────────────────┘');
  console.log('');

  if (hasClaudeCli()) {
    if (await askBool('Install the dougs plugin via Claude Code marketplace?', true)) {
      try {
        console.log(`\n→ Adding marketplace: ${REPO}`);
        execSync(`claude plugin marketplace add ${REPO}`, { stdio: 'inherit' });
        console.log(`→ Installing plugin: ${PLUGIN_NAME}@${MARKETPLACE}`);
        execSync(
          `claude plugin install ${PLUGIN_NAME}@${MARKETPLACE} --scope user`,
          { stdio: 'inherit' },
        );
        console.log('✓ Plugin installed.\n');
      } catch (e) {
        console.error('\n⚠ Plugin install failed. You can run it manually later:');
        console.error(`  claude plugin marketplace add ${REPO}`);
        console.error(`  claude plugin install ${PLUGIN_NAME}@${MARKETPLACE}\n`);
      }
    }
  } else {
    console.log('ℹ Claude Code CLI not detected. Skipping plugin install.');
    console.log(`  Install manually: claude plugin marketplace add ${REPO}`);
    console.log(`  Then: claude plugin install ${PLUGIN_NAME}@${MARKETPLACE}\n`);
  }

  console.log("Now let's configure your company info for quote generation.\n");

  const companyId = await ask('Dougs company_id (URL .../c/<ID>/...)');
  if (!/^\d+$/.test(companyId)) {
    console.error('✗ company_id must be numeric. Aborting.');
    close();
    process.exit(1);
  }
  const vatRate = await ask('Default VAT rate (0.2 = 20%)', '0.2');
  const unit = await ask('Default unit', 'unité');
  const expiration = await ask('Default quote validity (days)', '30');

  console.log('\n— Legal info (appears in quote footer) —\n');
  const legalName = await ask('Company legal name (e.g. "MY COMPANY SAS")');
  const brandName = await ask('Commercial brand name (or leave blank)', '');
  const street = await ask('Street address');
  const zipCity = await ask('Postal code + city');
  const entityType = await ask('Entity type (e.g. "SASU", "SARL")', 'SASU');
  const capital = await ask('Capital amount in € (or leave blank)', '');
  const siret = await ask('SIRET');
  const rcsCity = await ask('RCS city (e.g. "PARIS")');
  const rcsNumber = await ask('RCS number');
  const ape = await ask('APE code (e.g. "6201Z")');
  const vatNumber = await ask('Intracommunity VAT number');
  const phone = await ask('Phone (e.g. "+33...")');
  const email = await ask('Email');

  const cwd = process.cwd();
  const dir = join(cwd, '.claude');
  const path = join(dir, 'dougs.local.md');
  if (existsSync(path)) {
    if (!(await askBool('\n.claude/dougs.local.md already exists. Overwrite?', false))) {
      console.log('Aborted.');
      close();
      process.exit(0);
    }
  }

  mkdirSync(dir, { recursive: true });

  const invoicerOthersBlock = brandName ? `- nom commercial : ${brandName}\n` : '';
  const capitalLine = capital ? `${entityType} au capital de ${capital}€\n` : '';

  const content = `---
company_id: "${escapeQuotes(companyId)}"
default_vat_rate: ${vatRate}
default_unit: "${escapeQuotes(unit)}"
default_expiration_days: ${expiration}
---

# Dougs Plugin Config

## Invoicer Name

${legalName}

## Invoicer Others

${invoicerOthersBlock}
## Legal Information

${legalName}
Siège social : ${street}, ${zipCity}
${capitalLine}N° SIRET : ${siret} / RCS ${rcsCity} ${rcsNumber} / APE : ${ape}
N° TVA intracommunautaire : ${vatNumber}

## Contact Information

Tél : ${phone} / Email : ${email}

## Thank You Note

Merci pour votre confiance !

## Payment Terms

à réception

## Late Payment Terms

Des pénalités de retard au taux de 3 fois le taux d'intérêt légal seront appliquées en cas de non-paiement à la date d'échéance.
`;

  writeFileSync(path, content);
  console.log(`\n✓ Wrote ${path}`);

  console.log('\nNext steps:');
  console.log('  1. In Claude Code, run /dougs:refresh-session to extract your Dougs cookie.');
  console.log('  2. Then /dougs:list-quotes to verify everything works.');
  console.log('  3. /dougs:create-quote to create your first draft.\n');

  close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  close();
  process.exit(1);
});
