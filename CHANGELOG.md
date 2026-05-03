# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/). This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/alexandrebouchez/dougs-skills/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alexandrebouchez/dougs-skills/releases/tag/v0.1.0
