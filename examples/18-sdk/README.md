# 18 · SDK (embed Pi in your own Node program)

**Capability:** `createAgentSession()` — the same agent loop as the CLI, in-process, fully scriptable.

| Script | Shows |
|---|---|
| [01-minimal.ts](01-minimal.ts) | create → subscribe → `prompt()` → `dispose()` |
| [02-tools-and-events.ts](02-tools-and-events.ts) | `customTools`, an **inline extension** (veto `bash`), and event subscription |
| [03-sessions.ts](03-sessions.ts) | persistent sessions: create, close, reopen with `continueRecent`, list |
| [04-resources.ts](04-resources.ts) | `DefaultResourceLoader` discovery + `skillsOverride` filtering |
| [_mock-session.ts](_mock-session.ts) | helper: a session wired to the offline mock model |

## Run

```bash
node examples/18-sdk/01-minimal.ts
node examples/18-sdk/02-tools-and-events.ts
node examples/18-sdk/03-sessions.ts
node examples/18-sdk/04-resources.ts
```

(Node ≥ 22.19 runs `.ts` files directly by stripping types — no build step. Pi's own extensions use the `jiti` loader instead.)

## Using a real model

Delete the `mockProvider` wiring in `_mock-session.ts` (the `extensionFactories` entry and the `setModel` call) and let
the session pick its model from settings/credentials, or pass `model: getModel("<provider>", "<id>")` from `@earendil-works/pi-ai`.

## Concepts

- **`session.prompt()`** resolves when the *run* finishes, tool calls included. While streaming, a second prompt must say
  `steer` (interrupt after the current turn) or `followUp` (after the run) — otherwise it rejects.
- **Events:** `session.subscribe(cb)`; the authoritative final message is `message_end`; "will not continue" is `agent_settled`.
- **Everything is injectable:** `modelRuntime`, `settingsManager`, `sessionManager`, `resourceLoader`, `tools`/`customTools`.
- **SDK vs RPC:** SDK = same process, full TypeScript API. RPC ([19](../19-rpc/README.md)) = child process, any language, isolation.
- The CLI's built-in `codemode`, `tool_search` and MCP are *not* auto-added in the SDK; add `createMcpExtension()` etc. (Pi's `examples/sdk/14-codemode-mcp.ts`).

Pi docs: `docs/sdk.md`, Pi's `examples/sdk/01…14`.
