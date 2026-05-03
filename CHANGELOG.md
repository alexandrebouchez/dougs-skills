# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/). This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] — 2026-05-04

### Changed (BREAKING)
- Single `/dougs` slash command replaces the 8 individual `/dougs:<action>` commands. The skill `skills/dougs/SKILL.md` now contains routing rules; the 8 action descriptions live in `skills/dougs/references/<action>.md` (load-on-demand).
- Pattern aligned with `vercel-labs/agent-skills` and the `impeccable` skill: single entrypoint per domain, progressive disclosure via references.

### Migration
- Replace `/dougs:list-quotes` with `/dougs list-quotes` (and so on for all 8 actions).
- Natural-language invocation is now supported: `/dougs crée un devis pour Acme`.

### Added
- Setup gates in `SKILL.md`: the plugin checks `.claude/dougs.local.md` and `~/.dougs-session` before any action.
- Routing table in `SKILL.md` mapping natural-language intents to actions.

## [0.1.0] — 2026-05-04

### Added
- Initial public release
- Plugin with 8 commands: `setup`, `refresh-session`, `create-quote`, `edit-quote`, `list-quotes`, `view-quote`, `download-quote`, `list-customers`
- Brouillon-only enforcement: `create-quote` forces `status: 'DRAFT'`, `edit-quote` preserves status and refuses `FINALIZED`, the Dougs `finalize()` endpoint is not exposed
- Per-project configuration via `.claude/dougs.local.md` (frontmatter + markdown sections for legal/contact info)
- Direct fetch with cookie-based auth (~100ms per call vs. 3–5s via Chrome MCP)
- Strict guardrails in `lib/guardrails.mjs` (whitelist + blacklist + DELETE block + FINALIZED check)
- Cross-platform config loading with CRLF + UTF-8 BOM normalization
- 15-second fetch timeout with clean error messages on network failure
- PDF download follows redirects manually, same-origin verification
- npx wizard (`@drivenlabs/dougs`) for one-command install + setup
- 30 tests covering session I/O, fetch wrapper, guardrails, config, defaults, edge cases (CRLF, BOM, escaped quotes)

[Unreleased]: https://github.com/alexandrebouchez/dougs-skills/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/alexandrebouchez/dougs-skills/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/alexandrebouchez/dougs-skills/releases/tag/v0.1.0
