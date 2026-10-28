# 04 · Prompt templates (`/commands` from Markdown)

**Capability:** reusable prompts with arguments. Zero code. File name = command name.

| Template | Shows |
|---|---|
| [review.md](review.md) | `${1:-default}` — optional argument with a default |
| [explain.md](explain.md) | `$1`, `${2:-medium}`, `${@:3}` (all arguments from the 3rd on), and `@file` inclusion |
| [compare.md](compare.md) | shell-style quoting: `/compare "React hooks" classes` → `$1` = `React hooks` |

Substitutions: `$1…`, `$@`/`$ARGUMENTS`, `${1:-x}`, `${@:N}`, `${@:N:L}`.

## Run

```bash
scripts/pi-iso --prompt-template examples/04-prompt-templates -p '/explain src/index.ts deep "watch the auth flow"'
scripts/pi-iso --prompt-template examples/04-prompt-templates -p '/review'
```

The mock model echoes what it received, so you see the *expanded* text. Interactive: type `/` and the templates are in the menu.

## How it interacts

- Expansion happens **after** the `input` event ([10](../10-input-transform/README.md)) and **before** the model. An extension
  command with the same name wins over a template.
- Templates are plain text → no trust risk beyond what the text asks the model to do; but `.pi/prompts/` still needs trust.
- Skills are the heavier sibling: use a template for "reuse this sentence", a skill for "teach a procedure with files" ([05](../05-skills/README.md)).

Pi docs: `docs/prompt-templates.md`.
