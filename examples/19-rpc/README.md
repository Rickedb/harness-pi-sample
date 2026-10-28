# 19 · RPC mode (drive Pi from any language)

**Capability:** `pi --mode rpc` — a long-lived child process speaking JSONL on stdin/stdout.

| File | Shows |
|---|---|
| [rpc-client.ts](rpc-client.ts) | the typed `RpcClient`: prompts, events, `getState`, `getCommands`; proves tools unlocked in one prompt persist ([15](../15-dynamic-tools/README.md)) |
| [rpc-raw.mjs](rpc-raw.mjs) | **no library**: raw framing, and answering an extension's `confirm` dialog (the [09](../09-guardrails/README.md) guardrail). `node … deny` to refuse |
| [rpc_minimal.py](rpc_minimal.py) | the same protocol from Python, stdlib only |

## Run

```bash
node examples/19-rpc/rpc-client.ts
node examples/19-rpc/rpc-raw.mjs            # approves  → bash runs
node examples/19-rpc/rpc-raw.mjs deny       # refuses   → "Blocked by the user"
python3 examples/19-rpc/rpc_minimal.py
```

Try it by hand: `scripts/pi-iso --mode rpc --no-session`, then paste `{"id":"1","type":"prompt","message":"inspect"}`.

## The protocol in one screen

```
stdin  ─▶ {"id":"1","type":"prompt","message":"…"}        commands (get_state, set_model, fork, compact, bash, …)
stdout ◀─ {"id":"1","type":"response","success":true,…}   ack ONLY — "accepted", not "done"
stdout ◀─ {"type":"message_update",…} {"type":"tool_execution_start",…} …   the same events as JSON mode
stdout ◀─ {"type":"extension_ui_request","id":"u1","method":"confirm",…}    an extension asks a question
stdin  ─▶ {"type":"extension_ui_response","id":"u1","confirmed":true}        you answer
stdout ◀─ {"type":"agent_settled"}                          ← the real "finished" signal
```

## Rules that bite

- Split stdout on **`\n` only** (not Node `readline`, not text-mode line readers that honor U+2028).
- Subscribe to events **before** sending the prompt; a fast run can finish first.
- `agent_end` ≠ done (retries, compaction, queued messages can follow). Wait for **`agent_settled`**.
- Keep reading stdout or Pi stalls on backpressure. Diagnostics go to stderr — never parse stderr.
- Close stdin to shut down cleanly.
- Dialog support is an `extension_ui` sub-protocol: `ctx.hasUI` is true in RPC, `ctx.mode === "rpc"`; `custom()` components are not available.

Pi docs: `docs/rpc.md`, `docs/rpc-commands.md`, `docs/rpc-extension-ui.md`, `docs/json.md`.
