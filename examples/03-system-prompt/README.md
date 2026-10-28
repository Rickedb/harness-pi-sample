# 03 · System prompt (`SYSTEM.md`, `APPEND_SYSTEM.md`, flags)

**Capability:** replace or extend Pi's base system prompt.

| Mechanism | Effect | Scope |
|---|---|---|
| `.pi/APPEND_SYSTEM.md` / `<agent-dir>/APPEND_SYSTEM.md` | **adds** to the default prompt | project (needs trust) / user |
| `.pi/SYSTEM.md` / `<agent-dir>/SYSTEM.md` | **replaces** the default prompt | project (needs trust) / user |
| `--append-system-prompt <text\|file>` (repeatable) | adds, one run | CLI |
| `--system-prompt <text\|file>` | replaces, one run | CLI |

## Run

```bash
scripts/pi-iso --append-system-prompt examples/03-system-prompt/append.md -p inspect   # ~2.9k chars, marker present
scripts/pi-iso --system-prompt        examples/03-system-prompt/replace.md -p inspect   # ~144 chars: the default prompt is GONE
```

The full-stack version of "append" is [`.pi/APPEND_SYSTEM.md`](../../.pi/APPEND_SYSTEM.md): `scripts/pi-stack -p inspect` shows `project-append-system`.

## How it interacts

- Replacing the prompt removes Pi's built-in tool guidance. Context files, skill listings and tool snippets are still
  appended — they are *sections* added on top (see [13 · prompt hooks](../13-prompt-hooks/README.md) for editing sections in code).
- Prefer **append** unless you truly want a different agent.

Pi docs: `docs/configuration.md`, `docs/cli.md#prompts-and-process`.
