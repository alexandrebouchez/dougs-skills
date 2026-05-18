# dougs

A Claude Code plugin to manage [Dougs](https://www.dougs.fr) draft quotes from your terminal. Direct API calls (~100ms), brouillon-only, with strict guardrails.

> **Disclaimer.** This is an **unofficial, third-party** integration. Not affiliated with, endorsed by, or supported by Dougs. The plugin reverse-engineers Dougs' internal HTTP API; it may break without warning if Dougs changes their endpoints. Use at your own risk on your own Dougs account. No data is sent anywhere except `app.dougs.fr` (your own session).

## Quick start

```bash
# 1. Install the plugin (Claude Code marketplace)
claude plugin marketplace add alexbouchez/dougs
claude plugin install dougs@dougs --scope user

# 2. Configure your company info (interactive wizard, run from a project root — not your home dir)
npx @drivenlabs/dougs

# 3. In Claude Code
/dougs refresh-session     # extract Dougs session cookie from authenticated Chrome tab
/dougs list-quotes         # smoke test
/dougs create-quote        # create a draft
```

> **Note.** The npm wizard `@drivenlabs/dougs` ships in a follow-up. If `npx @drivenlabs/dougs` returns 404, the marketplace install in step 1 already works — fall back to the manual setup ([Configuration](#configuration)) for the company info file.

## Usage

A single slash command, `/dougs`, dispatches to the right action based on the argument or your natural-language intent. The plugin reads `skills/dougs/SKILL.md` for routing rules and loads `skills/dougs/references/<action>.md` on demand.

### Actions

| Action | Description |
|--------|-------------|
| `/dougs setup` | Configure the plugin (company_id, defaults, legal info) |
| `/dougs refresh-session` | Extract/refresh Dougs session cookie |
| `/dougs create-quote` | Create a new draft (DRAFT) |
| `/dougs edit-quote` | Modify a draft, or an issued quote (PENDING — with explicit warning) |
| `/dougs list-quotes` | List issued quotes (DRAFT excluded) |
| `/dougs view-quote <id>` | Show full quote detail |
| `/dougs download-quote <id>` | Download a quote PDF |
| `/dougs list-customers` | List customers |

### Natural language

You can also invoke the plugin with intent rather than action names. The skill infers the action:

```
/dougs crée un devis pour Acme SARL
/dougs donne-moi la liste de mes devis
/dougs télécharge le PDF du dernier devis
```

See the routing table in `skills/dougs/SKILL.md`.

## Brouillon-only philosophy

The plugin **never issues or finalizes quotes automatically**. It only creates and modifies drafts (`DRAFT` status). The transitions `DRAFT → PENDING` (issuance) and `PENDING → FINALIZED` (validation/signature) stay manual in the Dougs UI — these are committing actions ("the client has received this", "this is signed") and you always click those buttons yourself.

The plugin enforces this in code: `create-quote` forces `status: 'DRAFT'` in every payload, `edit-quote` preserves the loaded status (refuses `FINALIZED`), and the Dougs `finalize()` endpoint is deliberately not exposed.

## Installation

### Method 1 — Claude Code marketplace (standard)

```bash
claude plugin marketplace add alexbouchez/dougs
claude plugin install dougs@dougs --scope user
```

### Method 2 — npx wizard (one-shot install + setup)

From the root of any project:

```bash
npx @drivenlabs/dougs
```

The wizard:
1. Adds the marketplace and installs the plugin (if `claude` CLI is available)
2. Asks for your company info (company_id, legal mentions, contact)
3. Writes `.claude/dougs.local.md` (gitignored)

### Method 3 — Vercel Labs `npx skills` (universal)

```bash
npx skills add alexbouchez/dougs
```

This works for any agent supporting the [Agent Skills specification](https://agentskills.io) — Claude Code, OpenCode, Cursor, etc.

### Method 4 — Claude Cowork (Desktop UI)

In the Claude Desktop app:

1. Click the **Cowork** tab (mode selector at the top)
2. Click **Customize** in the left sidebar
3. Click **Browse plugins** → **Personal**
4. Click the **+** button → **Add marketplace from GitHub**
5. Enter the URL: `https://github.com/alexbouchez/dougs`
6. Install the `dougs` plugin

The skill activates automatically. If it doesn't appear after install (known issue [#39400](https://github.com/anthropics/claude-code/issues/39400) on marketplace mounting in some Cowork builds), upload the `plugin/` folder as a zip via the same Browse plugins screen.

CLI equivalent (works identically in Cowork): same as [Method 1](#method-1--claude-code-marketplace-standard).

## Configuration

Configuration lives in `.claude/dougs.local.md` per project (gitignored). The wizard creates it for you. Manual setup:

```bash
mkdir -p .claude
cp "$(claude plugin path dougs)/.claude/dougs.local.md.template" .claude/dougs.local.md
# then edit .claude/dougs.local.md
```

`.claude/dougs.local.md` structure:

```markdown
---
company_id: "123456"               # numeric, from your Dougs URL: app.dougs.fr/app/c/<ID>/...
default_vat_rate: 0.2
default_unit: "unité"
default_expiration_days: 30
---

## Invoicer Name
MY COMPANY SAS

## Invoicer Others
- nom commercial : MY BRAND

## Legal Information
MY COMPANY SAS
Siège social : [STREET], [POSTAL CODE] [CITY]
SASU au capital de [AMOUNT]€
N° SIRET : [SIRET] / RCS [CITY] [RCS] / APE : [APE]
N° TVA intracommunautaire : [VAT NUMBER]

## Contact Information
Tél : [PHONE] / Email : [EMAIL]

## Thank You Note
Merci pour votre confiance !

## Payment Terms
à réception

## Late Payment Terms
Des pénalités de retard au taux de 3 fois le taux d'intérêt légal seront appliquées en cas de non-paiement à la date d'échéance.
```

### Windows note

The plugin and wizard run on Node 18+ on macOS, Linux and Windows. CRLF line endings and UTF-8 BOM in `.claude/dougs.local.md` (common with Notepad) are normalized at load time. The `0600` permission on `~/.dougs-session` is a no-op on Windows; the file inherits the user profile ACL instead, which provides equivalent same-user-only access.

## Authentication

Dougs has no public API key. Auth uses an HttpOnly session cookie set by Google SSO.

`/dougs refresh-session` extracts the cookie from an authenticated Chrome tab on `app.dougs.fr`. Two methods:

| Method | Requirements | Steps |
|--------|--------------|-------|
| **A — DevTools manual** (universal) | Just Chrome | Open DevTools on the Dougs tab → Network → click on `users/me` → Headers → copy the `Cookie` header value → paste into Claude conversation |
| **B — Chrome MCP** (if `claude-in-chrome` is installed) | `mcp__claude-in-chrome__*` tools | Claude orchestrates everything via MCP — no copy/paste |

The cookie is stored at `~/.dougs-session` (mode `0600`, never committed).

## Compatibility

| Environment | Status | Notes |
|-------------|--------|-------|
| Claude Code CLI | ✓ | Primary target |
| Claude Code Mac/Windows desktop | ✓ | |
| IDE extensions (VS Code, JetBrains) | ✓ | |
| **Claude Cowork (Desktop)** | ✓ | Cowork is local — filesystem and Chrome connector both work. See [issue #39400](https://github.com/anthropics/claude-code/issues/39400) for marketplace mounting bug; zip upload is the fallback if affected. |
| Other agents (OpenCode, Cursor, etc.) | Partial | Skill markdown loads via `npx skills add`; the Node CLI requires Node 18+ available. Triggering may differ. |

## Architecture

```
dougs/
├── plugin/                             # the plugin (referenced from alexbouchez/plugins via git-subdir)
│   ├── .claude-plugin/plugin.json
│   ├── .claude/dougs.local.md.template
│   ├── lib/                            # auth, api, config, defaults, guardrails, validators, stdin
│   ├── bin/dougs.mjs                   # CLI dispatcher (me, list-quotes, create-draft, …)
│   ├── commands/dougs.md               # one slash command (`/dougs`) — dispatcher only
│   ├── skills/dougs/SKILL.md           # main skill: routing rules, doctrine, action menu
│   ├── skills/dougs/references/        # 8 action references (load-on-demand)
│   ├── scripts/                        # build-quote-payload, validate-quote
│   └── tests/                          # node:test, 31 cases
└── init/                               # @drivenlabs/dougs npm package (zero-dep wizard)
    ├── package.json
    └── bin/cli.mjs
```

| Component | Role |
|-----------|------|
| Cookie session | Extracted once via Chrome (DevTools or MCP), stored at `~/.dougs-session` (0600). |
| `lib/auth.mjs` | Read/write `~/.dougs-session`, raise `SessionExpiredError` on missing cookie. |
| `lib/api.mjs` | `fetch` wrapper with `Cookie` header, runs `assertSafeEndpoint` before every write. |
| `lib/config.mjs` | Walk-up search for `.claude/dougs.local.md`, parse YAML frontmatter, cache cwd-aware. |
| `lib/defaults.mjs` | Parse markdown sections (`## Invoicer Name`, `## Legal Information`, …) into the quote footer. |
| `lib/guardrails.mjs` | `assertSafeEndpoint` (whitelist + blacklist + DELETE block), `assertQuoteEditable` (refuse FINALIZED). |
| `lib/validators.mjs` | Structural validation of quote payloads (lines, dates, VAT rates). |
| `bin/dougs.mjs` | CLI dispatcher. Exit codes: 0 OK, 1 error, 2 usage, 3 SESSION_EXPIRED. |

## Security

The plugin enforces these rules in `lib/guardrails.mjs`:

| Rule | Implementation |
|------|----------------|
| Never write to invoices | `/sales-invoices` and `/vendor-invoices` blacklisted (any method) |
| Never DELETE | Blocked on every endpoint |
| Never modify FINALIZED | `assertQuoteEditable` checked before every PUT |
| Never call `finalize()` | Endpoint not exposed in `lib/api.mjs` or CLI |
| Confirm before writes | Every POST/PUT requires explicit user confirmation in the skill prompts |
| Strict whitelist | Only `POST /quote-drafts` and `PUT /quotes/{uuid}` accept writes |

The session cookie at `~/.dougs-session` is mode `0600` (user read/write only). It is never committed (`.gitignore`). All API calls go directly to `app.dougs.fr` — no third-party server.

## Troubleshooting

### `SESSION_EXPIRED` (exit code 3)

Run `/dougs refresh-session` to re-extract the session cookie. The cookie expires after some hours of inactivity.

### `Dougs not configured`

The plugin couldn't find `.claude/dougs.local.md` walking up from the current directory. Run `npx @drivenlabs/dougs` or copy the template manually (see [Configuration](#configuration)).

### `Quote with id X should not be a draft`

The Dougs API returned 400. The quote you're trying to read is a `DRAFT` brouillon — `view-quote` and the underlying `/quotes/{uuid}` endpoint only return `PENDING`/`FINALIZED`. The plugin's `edit-quote` auto-falls-back to `/quote-drafts/{uuid}` for drafts. To list drafts, use the Dougs UI (Brouillons section) — they don't appear in `GET /quotes`.

### `cannot be finalized. Use finalize() method instead.`

You tried to update a quote with `status: 'PENDING'` while it's a `DRAFT`. The plugin forces `status: 'DRAFT'` in `create-quote` precisely to avoid this. If you see this error from a custom script: don't try to promote — use the Dougs UI to issue/finalize.

### Plugin install fails in Cowork

Known issue — see [anthropics/claude-code#39400](https://github.com/anthropics/claude-code/issues/39400). Workaround: download a zip of the `plugin/` directory and upload via the Cowork plugin UI.

## Tests

```bash
cd plugin
node --test tests/*.test.mjs
```

25 tests covering session cookie I/O, fetch wrapper with mocked transport, guardrails (whitelist, blacklist, DELETE block, status check), config walk-up + cache invalidation, markdown section parsing, fallback values.

## Contributing

Issues and PRs welcome. Two house rules:

- **No personal data in PRs.** All defaults are placeholders; your config lives in `.claude/dougs.local.md` (per-project, gitignored).
- **Brouillon-only is non-negotiable.** PRs that expose `finalize()` or any endpoint that promotes status without explicit user action will be rejected.

## License

MIT — see [LICENSE](./LICENSE).

## Author

Built by [Alexandre Bouchez](https://github.com/alexbouchez) at [Drivenlabs](https://drivenlabs.ai). Independent project — not affiliated with Dougs.

## Related

- [Dougs](https://www.dougs.fr) — the SaaS this plugin integrates with
- [Claude Code Plugins](https://code.claude.com/docs/en/plugins-reference) — official plugin reference
- [Agent Skills specification](https://agentskills.io) — cross-agent skill format
- [vercel-labs/skills](https://github.com/vercel-labs/skills) — universal skill installer (`npx skills`)
