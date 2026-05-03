# Security Policy

## Reporting a vulnerability

Please **do not open a public GitHub issue** for security vulnerabilities. Instead email **alexandre.bouchez@drivenlabs.ai** with:

- A description of the issue and its impact
- Steps to reproduce (if applicable)
- Your environment (OS, Node version, Claude Code version)

I will acknowledge within 72 hours and aim to ship a fix within 14 days for critical issues.

## Scope

This plugin is in scope for security reports:

- Anything that can leak the Dougs session cookie (`~/.dougs-session`) outside `app.dougs.fr`
- Anything that can promote a quote past `DRAFT` without explicit user action (the brouillon-only invariant)
- Anything that can write to `/sales-invoices`, `/vendor-invoices`, or invoke `DELETE` on any endpoint (guardrail bypass)
- Path traversal, command injection, prompt injection that bypasses the guardrails declared in `lib/guardrails.mjs`

## Out of scope

- Issues in the Dougs API itself (report to Dougs)
- Cookie theft via OS-level access (compromised user account, malicious local processes running as the same user) — the plugin stores the cookie at `~/.dougs-session` (`0600`); protecting the user account is the user's responsibility
- Backups (Time Machine, iCloud Drive) including `~/.dougs-session` — exclude `~/.dougs-session` from backups if needed
- Trusted-toolchain assumptions: `execSync('claude ...')` from the install wizard trusts your `PATH`. If a hostile binary is in your `PATH`, that's an OS-level compromise, not a plugin issue
- Rate-limiting, denial-of-service against `app.dougs.fr` — please report to Dougs

## Hardening summary

The plugin follows these principles, enforced by code:

- Strict whitelist for write endpoints (`POST /quote-drafts`, `PUT /quotes/{uuid}`)
- Permanent blacklist for `DELETE` (any endpoint) and `*-invoices` (any method)
- The Dougs `finalize()` endpoint is deliberately not exposed — issuing/finalizing a quote remains a manual UI action
- Session cookie stored at `~/.dougs-session` with `0600` perms
- `fetch` calls are timed (15s default) and follow redirects manually with same-origin verification
- API responses are parsed as data, never executed as code or instructions
- Configuration is per-project (`.claude/dougs.local.md`), never written outside the project directory or the user's home

## Disclosure

After a fix is shipped, the vulnerability will be disclosed in `CHANGELOG.md` and a GitHub Advisory. Reporters who want credit are listed (with consent).
