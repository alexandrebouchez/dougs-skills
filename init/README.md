# @drivenlabs/dougs

Setup wizard for the [dougs Claude Code plugin](https://github.com/alexandrebouchez/dougs-skills).

## Usage

From the root of any project where you want to manage Dougs quotes:

```bash
npx @drivenlabs/dougs
```

The wizard:

1. Installs the dougs plugin via Claude Code marketplace (if `claude` CLI is available).
2. Prompts for your company info (company_id, legal mentions, contact).
3. Writes `.claude/dougs.local.md` (gitignored).

## After setup

In Claude Code:

```
/dougs:refresh-session    # extract Dougs session cookie from your authenticated Chrome tab
/dougs:list-quotes        # smoke test
/dougs:create-quote       # create your first draft
```

## License

MIT
