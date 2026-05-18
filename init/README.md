# @drivenlabs/dougs

Setup wizard for the [dougs Claude Code plugin](https://github.com/alexbouchez/dougs).

> **Disclaimer.** Unofficial, third-party integration. Not affiliated with or endorsed by [Dougs](https://www.dougs.fr). Reverse-engineered against Dougs' internal HTTP API; may break without warning. Use at your own risk on your own Dougs account.

## Usage

From the root of any project where you want to manage Dougs quotes:

```bash
npx @drivenlabs/dougs
```

The wizard:

1. Adds the marketplace and installs the dougs plugin (if `claude` CLI is available)
2. Prompts for your company info (company_id, legal mentions, contact)
3. Writes `.claude/dougs.local.md` (gitignored)

## After setup

In Claude Code:

```
/dougs refresh-session    # extract Dougs session cookie from your authenticated Chrome tab
/dougs list-quotes        # smoke test
/dougs create-quote       # create your first draft
```

## See also

- Full plugin documentation: [github.com/alexbouchez/dougs](https://github.com/alexbouchez/dougs)

## License

MIT
