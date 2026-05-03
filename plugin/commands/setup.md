---
description: "Configure the Dougs plugin (company ID, defaults, legal info)"
argument-hint: ""
---

# Setup Dougs

## Recommended : npx wizard

Run from your project root:

```bash
npx @drivenlabs/dougs
```

The wizard asks for your company info (company_id, legal mentions, contact) and writes `.claude/dougs.local.md` for you.

## Manual setup

If you prefer manual config, copy the template:

```bash
mkdir -p .claude
cp "${CLAUDE_PLUGIN_ROOT}/.claude/dougs.local.md.template" .claude/dougs.local.md
```

Then edit `.claude/dougs.local.md` and fill in `company_id`, legal info, and contact details. Find your `company_id` in your Dougs URL: `app.dougs.fr/app/c/<ID>/...`.

## Initialize the session

After config, run `/dougs:refresh-session` to extract the Dougs session cookie from your authenticated Chrome tab on `app.dougs.fr`.

## Verify

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/dougs.mjs" me --pretty
```

Should print the connected email and `preferredCompanyId`. If `SESSION_EXPIRED` → run `/dougs:refresh-session`.

## Confirm

```
Dougs configured: [EMAIL] | Company [ID]
Plugin ready — use /dougs:list-quotes, /dougs:create-quote, etc.
```
