# dougs-skills

**A Claude Code plugin to manage Dougs quotes from your terminal — fast, safe, brouillon-only.**

[Dougs](https://www.dougs.fr) is a French online accounting platform. Their dashboard is great, but every quote takes 10+ clicks. This plugin lets you create, edit, list, view and download Dougs draft quotes via slash commands in [Claude Code](https://claude.com/claude-code) — direct API calls, ~100ms latency, with strict guardrails.

## TL;DR

```bash
npx @drivenlabs/dougs
```

The wizard installs the plugin and configures your company info. Then in Claude Code:

```
/dougs:refresh-session        # one-time: extract Dougs session cookie from Chrome
/dougs:list-quotes            # list issued quotes
/dougs:create-quote           # create a draft (DRAFT — never auto-issued)
/dougs:edit-quote <id>        # modify a draft or pending quote
/dougs:download-quote <id>    # download PDF
```

## What it does

| Command | Action |
|---------|--------|
| `/dougs:setup` | Initial config + session pointers |
| `/dougs:refresh-session` | Extract/refresh Dougs session cookie via Chrome MCP |
| `/dougs:create-quote` | Create a new draft (DRAFT) |
| `/dougs:edit-quote` | Modify a draft or issued quote (refuses FINALIZED) |
| `/dougs:list-quotes` | List quotes (filters by `--status pending\|finalized`) |
| `/dougs:view-quote` | Show full detail of a quote |
| `/dougs:download-quote` | Download the PDF |
| `/dougs:list-customers` | List customers |

## Brouillon-only philosophy

The plugin **never issues or finalizes quotes automatically.** It creates and modifies drafts (DRAFT status). Issuing a draft (DRAFT → PENDING) and validating an issued quote (PENDING → FINALIZED) are committing actions that mean *"this is sent to the client"* or *"this is signed"* — irreversible side. **You always click those buttons yourself in the Dougs UI.**

The plugin force-sets `status: 'DRAFT'` on every PUT in `create-quote` and preserves the existing status in `edit-quote`. The Dougs `finalize()` endpoint is deliberately not exposed.

## Compatibility

Claude Code in any local environment:

- ✓ Claude Code CLI
- ✓ Claude Code Mac/Windows desktop app
- ✓ IDE extensions (VS Code, JetBrains)
- ✓ **Claude Cowork** (Desktop, local) — see note below

Cowork is a local Desktop app, so the plugin's filesystem access (`~/.dougs-session`, `.claude/dougs.local.md`) and Chrome control work the same way. Note: a known marketplace mounting bug (anthropics/claude-code#39400) may prevent SKILL.md loading via marketplace install in Cowork — fallback is zip upload of the plugin.

The plugin requires Chrome locally for `/dougs:refresh-session` (extraction of the HttpOnly session cookie).

## Manual install (alternative to npx wizard)

```bash
# Add the marketplace
claude plugin marketplace add alexandrebouchez/dougs-skills

# Install the plugin
claude plugin install dougs@dougs-skills --scope user
```

You can also install via Vercel Labs' universal `npx skills`:

```bash
npx skills install alexandrebouchez/dougs-skills
```

## Manual config (alternative to npx wizard)

Create `.claude/dougs.local.md` in your project root:

```bash
mkdir -p .claude
cp "$(claude plugin path dougs)/.claude/dougs.local.md.template" .claude/dougs.local.md
```

Then edit the file — fill in `company_id` (find it in your Dougs URL: `app.dougs.fr/app/c/<ID>/...`) and the `## Invoicer Name`, `## Legal Information`, `## Contact Information`, etc. sections that populate your quote footer.

## Architecture

- **Cookie session**: extracted once via Chrome MCP from an authenticated tab, stored in `~/.dougs-session` (mode 0600).
- **Direct fetch**: every API call is a Node `fetch` with the `Cookie` header. ~50–100ms per call.
- **Per-project config**: `.claude/dougs.local.md` (gitignored) holds your company_id, defaults, and footer info. Walked-up from cwd, so it works in subprojects too.
- **Zero npm runtime deps** for the plugin (pure Node 18+ stdlib). Wizard `@drivenlabs/dougs` is also zero-dep (`node:readline`).

## Security guardrails

The plugin enforces these absolute rules in `lib/guardrails.mjs`:

1. **Never write to invoices.** `/sales-invoices` and `/vendor-invoices` are blacklisted.
2. **Never DELETE.** Blocked on every endpoint.
3. **Never modify a FINALIZED quote.** Status check before every PUT.
4. **Never call `finalize()`.** Endpoint not exposed.
5. **User confirmation before every POST or PUT.**
6. **Strict whitelist** for write paths: only `POST /quote-drafts` and `PUT /quotes/{uuid}`.

The session cookie file `~/.dougs-session` is set to mode 0600 (user read/write only) and never committed.

## Project structure

```
dougs-skills/
├── .claude-plugin/marketplace.json     # Claude Code marketplace entry
├── plugin/                             # the plugin itself
│   ├── .claude-plugin/plugin.json
│   ├── .claude/dougs.local.md.template
│   ├── lib/{auth,api,config,defaults,guardrails,validators,stdin}.mjs
│   ├── bin/dougs.mjs                   # CLI dispatcher
│   ├── commands/                       # slash commands (legacy markdown format)
│   ├── skills/dougs/SKILL.md           # main skill
│   ├── scripts/                        # build/validate quote payload
│   └── tests/                          # node:test
└── init/                               # @drivenlabs/dougs npm package
    ├── package.json
    └── bin/cli.mjs                     # interactive wizard
```

## Contributing

Issues and PRs welcome. Please don't include any personal/company-specific data in PRs — the plugin's defaults are deliberately generic, and your config lives in `.claude/dougs.local.md` (per-project, gitignored).

## License

MIT — see [LICENSE](./LICENSE).
