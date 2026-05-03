import { test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, clearConfigCache } from '../lib/config.mjs';
import { loadDefaults, clearDefaultsCache } from '../lib/defaults.mjs';

let tmpDir;
let originalCwd;

beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = mkdtempSync(join(tmpdir(), 'dougs-cfg-'));
  clearConfigCache();
  clearDefaultsCache();
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
  clearConfigCache();
  clearDefaultsCache();
});

function writeConfig(dir, content) {
  const cfgDir = join(dir, '.claude');
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(join(cfgDir, 'dougs.local.md'), content);
}

test('loadConfig throws when no config file is found', () => {
  process.chdir(tmpDir);
  assert.throws(() => loadConfig(), /Dougs not configured/);
});

test('loadConfig throws when company_id is missing', () => {
  writeConfig(tmpDir, '---\ndefault_vat_rate: 0.2\n---\n');
  process.chdir(tmpDir);
  assert.throws(() => loadConfig(), /Missing company_id/);
});

test('loadConfig parses company_id and defaults', () => {
  writeConfig(
    tmpDir,
    '---\ncompany_id: "12345"\ndefault_vat_rate: 0.1\ndefault_unit: "heure"\ndefault_expiration_days: 60\n---\n',
  );
  process.chdir(tmpDir);
  const cfg = loadConfig();
  assert.equal(cfg.companyId, '12345');
  assert.equal(cfg.defaultVatRate, 0.1);
  assert.equal(cfg.defaultUnit, 'heure');
  assert.equal(cfg.defaultExpirationDays, 60);
});

test('loadConfig invalidates cache when cwd changes', () => {
  const a = mkdtempSync(join(tmpdir(), 'dougs-a-'));
  const b = mkdtempSync(join(tmpdir(), 'dougs-b-'));
  writeConfig(a, '---\ncompany_id: "111"\n---\n');
  writeConfig(b, '---\ncompany_id: "222"\n---\n');

  process.chdir(a);
  assert.equal(loadConfig().companyId, '111');
  process.chdir(b);
  assert.equal(loadConfig().companyId, '222');

  rmSync(a, { recursive: true, force: true });
  rmSync(b, { recursive: true, force: true });
});

test('loadDefaults parses markdown sections', () => {
  writeConfig(
    tmpDir,
    `---
company_id: "12345"
---

# Config

## Invoicer Name

ACME SARL

## Legal Information

ACME SARL
123 rue Test
SIRET: 123456789

## Contact Information

Tél : +33100000000
`,
  );
  process.chdir(tmpDir);
  const d = loadDefaults();
  assert.equal(d.invoicerName, 'ACME SARL');
  assert.match(d.footerData.legalInformation, /SIRET: 123456789/);
  assert.match(d.footerData.contactInformation, /\+33100000000/);
});

test('loadDefaults uses fallbacks when sections are missing', () => {
  writeConfig(tmpDir, '---\ncompany_id: "12345"\n---\n\n# No sections\n');
  process.chdir(tmpDir);
  const d = loadDefaults();
  assert.equal(d.invoicerName, 'My Company');
  assert.match(d.footerData.legalInformation, /\[Configure in/);
  assert.match(d.thankYouNote, /trust/);
});
