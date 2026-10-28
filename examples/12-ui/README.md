# 12 · UI surface (`ctx.ui`)

**Capability:** status line, widgets, window title, dialogs.

| API | Where it shows | Print / JSON | RPC | TUI |
|---|---|---|---|---|
| `notify` | toast | ✘ | ✔ (message) | ✔ |
| `select` / `confirm` / `input` / `editor` | modal dialog | ✘ | ✔ (request/response) | ✔ |
| `setStatus` / `setWidget` / `setTitle` | footer / above-below editor / tab title | ✘ | ✔ (fire-and-forget) | ✔ |
| `custom()`, `setFooter`, `setHeader`, editor replacement | full components | ✘ | ✘ | ✔ |

[ui-demo.ts](ui-demo.ts) counts turns and tool calls in the footer, pins "last tool" above the editor, and adds `/ui-wizard`.

## Run (interactive)

```bash
scripts/pi-iso -e examples/12-ui/ui-demo.ts -e examples/07-custom-tool/tools.ts
# type:  call roll_dice {"sides":6}   → the footer reads "1 turn(s) · 1 tool call(s)", a widget shows "last tool: roll_dice"
# then:  /ui-wizard                   → select → input → confirm dialogs
```

## Rules of thumb

- **Guard UI**: `ctx.hasUI` (dialogs work in TUI *and* RPC) or `ctx.mode === "tui"` (for `custom()` and friends).
  Tool and event logic must work with no UI at all.
- Dialogs block the agent until answered; pass a `timeout` for unattended safety.
- Other extensions share the footer: use a unique `setStatus` key. See [14](../14-event-bus/README.md) for two extensions each owning a key.

Pi docs: `docs/tui.md`, `docs/rpc-extension-ui.md`.
