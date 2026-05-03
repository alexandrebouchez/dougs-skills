#!/usr/bin/env node
/**
 * Dougs CLI dispatcher.
 * Usage: node bin/dougs.mjs <command> [args]
 *
 * Exit codes:
 *   0 — success
 *   1 — generic error (4xx/5xx Dougs, payload invalide)
 *   2 — usage CLI invalide (commande inconnue, args manquants)
 *   3 — SESSION_EXPIRED (relancer /dougs:refresh-session)
 */

import { writeFileSync } from 'node:fs';
import {
  me,
  listQuotes,
  getQuote,
  createDraft,
  getDraft,
  updateQuote,
  listCustomers,
  downloadQuotePdf,
  SessionExpiredError,
} from '../lib/api.mjs';

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name) {
  const i = args.indexOf('--' + name);
  if (i === -1) return null;
  const next = args[i + 1];
  if (!next || next.startsWith('--')) return null;
  return next;
}

function has(name) {
  return args.includes('--' + name);
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, has('pretty') ? 2 : 0) + '\n');
}

async function readStdinJson() {
  if (process.stdin.isTTY) return null;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : null;
}

async function main() {
  switch (cmd) {
    case 'me':
      out(await me());
      break;

    case 'list-quotes': {
      let quotes = await listQuotes();
      const status = flag('status');
      if (status) quotes = quotes.filter((q) => q.status === status.toUpperCase());
      const limit = flag('limit');
      if (limit) quotes = quotes.slice(0, parseInt(limit, 10));
      out(quotes);
      break;
    }

    case 'view-quote': {
      const id = args[1];
      if (!id || id.startsWith('--')) throw new UsageError('dougs view-quote <uuid>');
      out(await getQuote(id));
      break;
    }

    case 'list-customers': {
      const customers = await listCustomers();
      const search = flag('search');
      const filtered = search
        ? customers.filter((c) =>
            (c.legalName || c.name || '').toLowerCase().includes(search.toLowerCase()),
          )
        : customers;
      out(filtered);
      break;
    }

    case 'create-draft':
      out(await createDraft());
      break;

    case 'get-draft': {
      const id = args[1];
      if (!id || id.startsWith('--')) throw new UsageError('dougs get-draft <uuid>');
      out(await getDraft(id));
      break;
    }

    case 'update-quote': {
      const id = args[1];
      if (!id || id.startsWith('--')) {
        throw new UsageError('dougs update-quote <uuid> < payload.json');
      }
      const payload = await readStdinJson();
      if (!payload) throw new UsageError('Pipe le payload JSON sur stdin');
      out(await updateQuote(id, payload));
      break;
    }

    case 'download-quote': {
      const id = args[1];
      const outPath = flag('out');
      if (!id || id.startsWith('--') || !outPath) {
        throw new UsageError('dougs download-quote <uuid> --out <path>');
      }
      const quote = await getQuote(id);
      if (!quote.file || !quote.file.path) {
        throw new Error('Pas de PDF disponible (devis non finalisé ?)');
      }
      const buf = await downloadQuotePdf(quote.file.path);
      writeFileSync(outPath, buf);
      out({ saved: outPath, size: buf.length, name: quote.file.name });
      break;
    }

    default:
      process.stderr.write(
        'Usage: dougs <me|list-quotes|view-quote|list-customers|create-draft|get-draft|update-quote|download-quote> [args]\n',
      );
      process.exit(2);
  }
}

class UsageError extends Error {
  constructor(usage) {
    super('Usage: ' + usage);
    this.name = 'UsageError';
  }
}

main().catch((err) => {
  if (err instanceof SessionExpiredError) {
    process.stderr.write(`SESSION_EXPIRED: ${err.message}\n`);
    process.exit(3);
  }
  if (err instanceof UsageError) {
    process.stderr.write(`ERROR: ${err.message}\n`);
    process.exit(2);
  }
  process.stderr.write(`ERROR: ${err.message}\n`);
  process.exit(1);
});
