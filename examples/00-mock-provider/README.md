# 00 · Mock provider (custom provider + offline "LLM")

**Capability:** a *custom provider* extension — `pi.registerProvider()` with your own `streamSimple`.
**Why it's here:** every other example runs against this scripted model, so you can learn Pi without an
API key, without cost, and with deterministic results.

| File | Role |
|---|---|
| [mock-provider.ts](mock-provider.ts) | Registers provider `mock`, model `scripted`; decides replies with a few regexes |

## Run

```bash
scripts/pi-iso                       # interactive, mock model preselected
scripts/pi-iso -p inspect            # one-shot
```

## The mock's vocabulary

| You type | The "model" does |
|---|---|
| `inspect` | Reports what Pi actually sent it: system-prompt size, `[marker:*]` tags found in it, declared tools, message counts |
| `run <cmd>` / `read <path>` / `write <path> <text>` | Calls `bash` / `read` / `write` |
| `call <tool> {json}` | Calls **any** registered tool (yours, MCP, package…) |
| anything else | Echoes your prompt — handy to see exactly how templates / skills / input transforms rewrote it |
| (after any tool result) | Summarizes the result in one message and stops |

`inspect` is the key learning tool. A real model hides what Pi put in the request; the mock prints it.

## What it teaches about providers

- A provider is just an extension. It receives a normalized `TranscriptContext` and must emit a well-formed
  event stream: `start` → `text_*` / `toolcall_*` → `done` (or `error`).
- It must call `options.onPayload` / `options.onResponse`. Without that, extension hooks
  (`before_provider_request`, `after_provider_response`) silently never fire. See the comment in the file.
- To use **Claude** instead: `PI_MODEL=claude scripts/pi-iso …` or `scripts/pi-claude` (any other provider: `PI_MODEL=<provider>/<model-id>`).
  Credentials and details: [docs/01-getting-started.md](../../docs/01-getting-started.md#using-claude-or-any-real-model).

Pi docs: `docs/custom-provider.md`.
