# 09 · Guardrails (gate and transform the model's tool use)

**Capability:** `tool_call` (gate) and `tool_result` (transform) hooks. Pi has **no permission prompts of its own** —
this is how you add them.

| Rule in [guardrails.ts](guardrails.ts) | Hook | Behaviour |
|---|---|---|
| dangerous `bash` (`rm -rf`, `sudo`, `dd if=`…) | `tool_call` | asks (TUI/RPC dialog); **no UI ⇒ blocked** (fail closed) |
| writes to `.env`, `.git/`, `node_modules/` | `tool_call` | blocked, user notified |
| secrets in any tool output (AWS keys, `sk-…`) | `tool_result` | replaced with `[REDACTED:…]` **before the model sees them** |

## Run

```bash
G="-e examples/09-guardrails/guardrails.ts"
scripts/pi-iso $G -p 'run rm -rf /tmp/never'                   # print mode has no UI → blocked
scripts/pi-iso $G -p 'write .env SECRET=1'                      # blocked: protected path
scripts/pi-iso $G -p 'run echo "key=AKIAABCDEFGHIJKLMNOP"'      # model sees key=[REDACTED:aws-key]
scripts/pi-iso $G                                               # TUI: type  run rm -rf /tmp/zz  → Yes/No dialog
node examples/19-rpc/rpc-raw.mjs [deny]                        # same dialog over the RPC protocol
```

## Things to know

- **Fail closed.** If the safety decision can't be made (no UI), return `{ block: true }`. A *crashing* `tool_call` handler also blocks.
- A blocked call **skips `tool_result`** (see [01 · trace](../01-trace/README.md)) — so announce blocks from the gate itself. That's why this file emits on `pi.events` ([14](../14-event-bus/README.md)).
- `tool_call` can also *mutate* `event.input` (e.g. force `--dry-run`); later handlers see the change.
- These hooks apply to **every** tool: built-ins, your own ([07](../07-custom-tool/README.md)), MCP ([16](../16-mcp/README.md)), and skill-driven `bash` ([05](../05-skills/README.md)).
- **This is a speed bump, not a sandbox.** Regexes on shell commands are bypassable and extensions run with your OS permissions. For real isolation use a container/VM (Pi docs: `docs/security.md`, `docs/containerization.md`).

Pi docs: `examples/extensions/permission-gate.ts|protected-paths.ts|confirm-destructive.ts`.
