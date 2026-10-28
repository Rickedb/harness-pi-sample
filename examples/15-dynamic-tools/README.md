# 15 · Dynamic tools (change the tool set mid-session)

**Capability:** `pi.setActiveTools()`, `pi.getActiveTools()`, registering tools late.

| Technique | Who triggers it | In [dynamic-tools.ts](dynamic-tools.ts) |
|---|---|---|
| register-but-hide | extension at `session_start` | `admin_*` tools exist but start inactive |
| **loader tool** | the *model* | `unlock_admin_tools` activates them when the user asks for admin work |
| profile switch | the *user* | `/mode safe` (read-only) / `/mode full` |

## Run

```bash
D=examples/15-dynamic-tools/dynamic-tools.ts
scripts/pi-iso -e $D -p inspect                          # 5 tools; no admin_*
node examples/19-rpc/rpc-client.ts                       # one long session: inspect → unlock → inspect shows admin_* appear and STAY
scripts/pi-iso -e $D                                     # TUI: inspect ; call unlock_admin_tools {} ; inspect ; /mode safe ; inspect
```

(Single `-p` runs can't show the "stays unlocked" part — each is a fresh process, and `session_start` hides the admin tools again.
RPC/TUI keep one live session.)

## Why bother

Fewer tools ⇒ shorter prompt, fewer wrong calls, smaller blast radius. Pi records tool changes in the transcript so the model is told.
For big tool collections Pi has built-ins: `tool_search` (find + activate on demand) and `codemode` (script many tool calls) — see `docs/mcp.md`, `docs/codemode.md`.

## How it interacts

- Hidden ≠ gated: a hidden tool can't be called, but a *visible* one still passes through [09 · guardrails](../09-guardrails/README.md).
- CLI flags `--tools` / `--exclude-tools` / `--no-tools` and the `defaultTools` setting set the *initial* set; extensions adjust from there.
- MCP tools ([16](../16-mcp/README.md)) have an `exposure` setting (`direct` | `deferred` | `codemode` | `hidden`) that is this same idea, configured in JSON.

Pi docs: `docs/extensions.md#tool-exposure`, `examples/extensions/dynamic-tools.ts|tools.ts|preset.ts`.
