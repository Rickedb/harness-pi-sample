# 08 · Commands, flags, shortcuts (how the *user* drives an extension)

**Capability:** `registerCommand`, `registerFlag`/`getFlag`, `registerShortcut`, plus `sendUserMessage`.

| Surface | Example | Notes |
|---|---|---|
| `/hello [name]` | tab-completes `world`, `Pi`, `team` | handlers run **in-process**; the model never sees the command |
| `--shout` | `pi --shout` makes `/hello` upper-case | flags appear in `--help` |
| `/session-info` | model, mode, tools, context usage from `ctx` | read-only introspection |
| `/ask-inspect` | injects the user message `inspect` | the bridge from a command *to* the model |
| `Ctrl+Shift+H` | notification | interactive mode only |

## Run

```bash
scripts/pi-iso -e examples/08-commands-flags-shortcuts/commands.ts --help | grep -A1 shout
scripts/pi-iso -e examples/08-commands-flags-shortcuts/commands.ts            # TUI: try /hello wo<TAB>, /session-info, /ask-inspect
scripts/pi-iso -e examples/08-commands-flags-shortcuts/commands.ts --shout    # then /hello world → HELLO, WORLD!
```

## How it interacts

- Name collisions: an extension command shadows a prompt template ([04](../04-prompt-templates/README.md)) of the same name.
- `ctx.mode` is `tui`, `rpc`, `json` or `print`. `ctx.ui.notify` is a no-op in print mode and a protocol message in RPC.
- `sendUserMessage` goes through the full pipeline (so [10 · input transform](../10-input-transform/README.md) sees it, tagged `source: "extension"`).
- Commands are listed to RPC clients via `get_commands` ([19](../19-rpc/README.md)).

Pi docs: `docs/extensions.md`, `docs/slash-commands.md`, `docs/keybindings.md`.
