---
name: dougs
description: >
  Manage Dougs draft quotes (French online accounting). Create, edit, view, download.
  Brouillon-only — emission/validation stays manual in the Dougs UI.
  Activated when the user mentions 'dougs', 'devis', 'quote', 'brouillon', 'facturation',
  'créer un devis', 'nouveau devis', 'modifier un devis', 'télécharger un devis',
  'générer un PDF de devis', 'devis pour [client]', 'facturer un client', 'clients dougs',
  or any action related to quote management.
---

# Dougs — Draft quote management

Plugin built on direct fetch to the Dougs internal API, with a session cookie extracted from an authenticated Chrome tab (Google SSO). No real-time call goes through Chrome MCP — only the initial cookie extraction.

**Brouillon-only principle**: the plugin only creates and modifies **drafts (DRAFT)**. The transitions `DRAFT → PENDING` (emission) and `PENDING → FINALIZED` (validation/signature) stay manual in the Dougs UI — the user always controls these committing steps.

## Available commands

| Command | Action |
|---------|--------|
| `/dougs:setup` | Initial config (company_id, defaults) + session pointers |
| `/dougs:refresh-session` | Extract/refresh session cookie |
| `/dougs:create-quote` | Create a new draft (DRAFT) |
| `/dougs:edit-quote` | Modify a draft (DRAFT) or an issued quote (PENDING) |
| `/dougs:list-quotes` | List quotes (issued only — DRAFT excluded) |
| `/dougs:view-quote` | Show full detail of a quote |
| `/dougs:download-quote` | Download the PDF of a quote (PENDING or FINALIZED) |
| `/dougs:list-customers` | List customers |

## Out of scope

- **Issue / Finalize** a draft (`finalize()` on Dougs side): committing action (validates as signed, irreversible on FINALIZED side, generates PDF). Always done by the user in the Dougs UI (`https://app.dougs.fr`).
- **Email send**: use the `/dougs:download-quote` fallback then send the PDF via your own email tool.

## Dougs statuses

The Dougs API distinguishes three statuses:

| Status | Description | Modifiable by plugin | PDF |
|--------|-------------|----------------------|-----|
| `DRAFT` | Draft, not yet issued | Yes | No |
| `PENDING` | Issued, awaiting client signature | Technically yes, with reinforced confirmation (the client may have already received the current version) | Yes |
| `FINALIZED` | Signed/validated, locked | **No** (plugin refuses) | Yes |

**`PUT /quotes/{uuid}` behavior**:

- If the payload keeps `status: 'DRAFT'` → the draft stays DRAFT, data saved.
- If the payload keeps `status: 'PENDING'` → the quote stays PENDING, data saved.
- If you try `DRAFT → PENDING` via PUT → the API refuses with `"cannot be finalized. Use finalize() method instead."` This is intentional: promotion requires `finalize()`, which is **deliberately not exposed by the plugin**.

`create-quote` therefore forces `status: 'DRAFT'` in the payload to guarantee brouillon-only. `edit-quote` does not touch the `status` field — it preserves the loaded quote's status.

## Authentication — session cookie

The Dougs API does not expose an API key. Auth relies on an HttpOnly cookie (Google SSO).

**One-time setup**: `/dougs:refresh-session` extracts the cookie from an authenticated Chrome tab on `app.dougs.fr`. The cookie is stored at `~/.dougs-session` (mode 0600).

**Per-call workflow**:

1. The CLI `bin/dougs.mjs` reads `~/.dougs-session`
2. Sends an HTTP fetch with the `Cookie` header
3. If 401 → exit code 3, message `SESSION_EXPIRED`
4. The skill prompts `/dougs:refresh-session` then retry

## Security guardrails

**ABSOLUTE RULES — NEVER DEVIATE:**

1. **NEVER write to invoices.** `/sales-invoices` and `/vendor-invoices` are blacklisted in `lib/guardrails.mjs`.
2. **NEVER DELETE.** Blocked by guardrail.
3. **NEVER modify a FINALIZED quote.** Verify `quote.status` before any PUT.
4. **NEVER call `finalize()`.** Not exposed in the plugin — the user issues/validates manually in the Dougs UI.
5. **Mandatory user confirmation** before any POST or PUT.
6. **Strict whitelist** (`ALLOWED_WRITE_PATHS` in `lib/config.mjs`):
   - `POST /companies/{id}/invoicing/quote-drafts`
   - `PUT /companies/{id}/invoicing/quotes/{uuid}`

## CLI exit codes

| Exit | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic error (invalid payload, resource not found, Dougs 4xx/5xx) |
| 2 | Bad CLI usage (unknown command, missing args) |
| 3 | `SESSION_EXPIRED` — run `/dougs:refresh-session` |

## Local configuration

`.claude/dougs.local.md`:

```yaml
---
company_id: "YOUR_DOUGS_COMPANY_ID"
default_vat_rate: 0.2
default_unit: "unité"
default_expiration_days: 30
---
```

Plus markdown sections (`## Invoicer Name`, `## Legal Information`, `## Contact Information`, etc.) used to populate the quote footer. See `.claude/dougs.local.md.template` for the complete structure.

## API Reference (internal, reverse-engineered)

**Base URL**: `https://app.dougs.fr` | **Company ID**: from `.claude/dougs.local.md`

**Allowed endpoints**:

- `GET /users/me` → auth ping
- `GET /companies/{id}/invoicing/quotes` → list of issued quotes (PENDING/FINALIZED) — DRAFTs do not appear here
- `GET /companies/{id}/invoicing/quotes/{uuid}` → detail of a PENDING/FINALIZED (returns 400 if DRAFT — use `/quote-drafts/{uuid}` for drafts)
- `POST /companies/{id}/invoicing/quote-drafts` (body: `{}`) → create a draft
- `GET /companies/{id}/invoicing/quote-drafts/{uuid}` → draft detail (~1.5s after POST, retry possible)
- `PUT /companies/{id}/invoicing/quotes/{uuid}` (body: COMPLETE object) → save a DRAFT or PENDING — **preserves the status**, does not promote
- `GET /companies/{id}/customers` → customer list
- PDF download: `quote.file.path` (follows redirect)

**Deliberately not exposed**:

- `POST /companies/{id}/invoicing/quotes/{uuid}/finalize` (or variant) — promotion DRAFT → PENDING / PENDING → FINALIZED. Too committing, manual UI action.
- `DELETE` (any endpoint) — blocked by guardrail.

**Creation flow (brouillon-only)**:

1. POST `quote-drafts` → DRAFT (pre-filled with footerData, legalData, invoicerOthers from your config)
2. wait ~1.5s
3. GET `quote-drafts/{uuid}` → complete object
4. Modify incrementally, **force `status: 'DRAFT'`**
5. PUT `quotes/{uuid}` → 200, draft saved as DRAFT

**Line structure** (required fields):

```json
{
  "title": "", "description": "", "unit": "unité",
  "quantity": 1, "unitAmount": 100, "vatRate": 0.2,
  "discount": 0, "discountUnit": "%", "reference": "",
  "amount": 100, "discountInEuros": 0, "isPriceWithVat": false
}
```
