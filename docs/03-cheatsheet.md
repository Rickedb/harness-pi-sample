# Cheat-sheet

Quick reference for working with Pi. Everything here is exercised by an example in this repo; the full references are the Pi docs
that ship in `node_modules/@earendil-works/pi-coding-agent/docs/`.

## Extension skeleton

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";                       // tool parameter schemas

export default function (pi: ExtensionAPI) {          // the factory runs at load; may be async
  // Do NOT start timers/sockets/processes here - start them in a session_start handler,
  // and close them in session_shutdown (idempotently).
  pi.on("tool_call", async (event, ctx) => { /* … */ });
  pi.registerTool({ name, label, description, parameters, async execute(id, params, signal, onUpdate, ctx) { … } });
  pi.registerCommand("name", { description, handler: async (args, ctx) => { … } });
}
```

Imports available to extensions: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai` (types, `StringEnum`, stream helpers),
`@earendil-works/pi-tui` (UI components), `typebox`. Anything else goes in a `package.json` next to the extension.

## `pi` API (registration & control)

| Method | Purpose | Example |
|---|---|---|
| `pi.on(event, handler)` | subscribe; returns an unsubscribe fn | [01](../examples/01-trace), [09](../examples/09-guardrails) |
| `pi.registerTool(def)` / `defineTool(def)` | model-callable tool | [07](../examples/07-custom-tool) |
| `pi.registerCommand(name, {description, handler, getArgumentCompletions})` | `/name` | [08](../examples/08-commands-flags-shortcuts) |
| `pi.registerFlag(name, {type, default, description})` · `pi.getFlag(name)` | `--name` CLI flag | [08](../examples/08-commands-flags-shortcuts) |
| `pi.registerShortcut("ctrl+shift+h", {handler})` | key binding (TUI) | [08](../examples/08-commands-flags-shortcuts) |
| `pi.sendUserMessage(text)` | inject a user prompt | [08](../examples/08-commands-flags-shortcuts) |
| `pi.sendMessage(msg, {triggerTurn})` | inject a *custom* message (stored + sent to model) | Pi `docs/extensions.md` |
| `pi.appendEntry(type, data)` | durable data in the session, **not** sent to model | [11](../examples/11-stateful-tool) |
| `pi.setActiveTools(names)` · `getActiveTools()` · `getAllTools()` | which tools the model sees | [15](../examples/15-dynamic-tools) |
| `pi.getCommands()` | list slash commands (extension/prompt/skill) | Pi `examples/extensions/commands.ts` |
| `pi.registerProvider(name, cfg)` · `unregisterProvider` | model backend | [00](../examples/00-mock-provider) |
| `pi.registerMcpServer(name, cfg)` | MCP server from code | [16](../examples/16-mcp) |
| `pi.setModel(m)` · `setThinkingLevel(l)` · `getThinkingLevel()` | change model / reasoning | Pi `examples/extensions/preset.ts` |
| `pi.events.on/emit(name, data)` | extension ↔ extension bus | [14](../examples/14-event-bus) |

## `ctx` (what handlers receive)

| Field / method | Notes |
|---|---|
| `ctx.cwd` · `ctx.mode` (`tui`/`rpc`/`json`/`print`) · `ctx.hasUI` | **guard UI by these** |
| `ctx.ui.notify / select / confirm / input` | dialogs — work in TUI and RPC |
| `ctx.ui.setStatus / setWidget / setTitle` | footer / above-below editor / tab title |
| `ctx.ui.custom(factory)` · `setFooter` · `setHeader` | full TUI components — **TUI only** |
| `ctx.sessionManager.getBranch()` / `getEntries()` | read the session tree → rebuild state |
| `ctx.model` · `ctx.modelRegistry` · `ctx.getContextUsage()` · `ctx.getSystemPrompt()` | introspection |
| `ctx.isIdle()` · `ctx.signal` · `ctx.abort()` · `ctx.compact()` · `ctx.shutdown()` | run control |
| command handlers only: `waitForIdle()`, `newSession()`, `fork()`, `reload()` | would deadlock inside event handlers |
| tool `execute()` only: `ctx.executeTool(name, args)` | call other tools through the same hooks |

## Events by intent

| I want to… | Event | Return to change something |
|---|---|---|
| rewrite/swallow user text | `input` | `{action:"transform", text}` · `{action:"handled"}` · `{action:"continue"}` |
| add prompt sections / instructions for this run | `before_agent_start` | mutate `event.systemPromptOptions.sections`, or return `{message}` / `{systemPrompt}` |
| prune/rewrite history for one request | `context` | `{messages}` |
| edit headers / raw payload | `before_provider_headers` / `before_provider_request` | mutate / return payload |
| allow / ask / block / edit a tool call | `tool_call` | `{block:true, reason}` or mutate `event.input` |
| redact / replace a tool result | `tool_result` | `{content, details, isError}` (replace `structuredContent` too if you redact) |
| react after each model response + its tools | `turn_end` | optionally `{continue:true}` (guard against loops!) |
| know Pi is really finished | `agent_settled` | — (notification) |
| set up / tear down per session | `session_start` / `session_shutdown` | — |
| react to branch navigation | `session_tree`, `session_before_fork`… | — |
| decide project trust | `project_trust` (user-level extensions only) | yes/no |

Handler composition: notifications ignore returns · transforms **chain** · gates **short-circuit** · handlers run in extension load order ·
a throwing `tool_call` handler **blocks** the call (fail-safe).

## Tool definition essentials

```ts
defineTool({
  name: "snake_case_name",
  label: "Human label",
  description: "What it does AND when to use it - the model reads this.",
  promptSnippet: "one line for the tool list",           // optional
  promptGuidelines: ["rule added to the system prompt"], // optional
  parameters: Type.Object({ x: Type.String({ description: "…" }) }),   // validated before execute()
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // throw new Error("…")  → error result for the model
    return { content: [{ type: "text", text: "what the MODEL sees" }], details: { /* for UI/state */ } };
  },
  renderCall(args, theme) { … }, renderResult(result, opts, theme) { … },   // optional TUI rendering
});
```
Name a tool like a built-in (`read`, `bash`…) to **override** it. Truncate large output and say where the rest is.

## Where state can live

| State | Storage | Follows `/tree`/`/fork` |
|---|---|---|
| tool state | tool-result `details` (rebuild on `session_start` + `session_tree`) | ✔ |
| durable, hidden from model | `pi.appendEntry` | ✔ |
| durable, shown to model | `pi.sendMessage` | ✔ |
| anything else | files / DB | ✘ |

## What works in which mode

| | TUI | RPC | JSON | print | SDK |
|---|:-:|:-:|:-:|:-:|:-:|
| tools, hooks, commands, providers, MCP | ✔ | ✔ | ✔ | ✔ | ✔ |
| `notify` `select` `confirm` `input` `setStatus` `setWidget` | ✔ | ✔ (protocol) | ✘ | ✘ | host-defined |
| `custom()` `setFooter` `setHeader` `setTheme` | ✔ | ✘ | ✘ | ✘ | ✘ |
| project trust prompt | ✔ | ✘ use `-a`/`-na` | ✘ | ✘ | n/a |
| slash commands typed by a user | ✔ | via `prompt` command | via prompt text | via prompt text | via `prompt()` |

## CLI essentials

```
pi [options] [@files…] [message…]          pi install|remove|update|list|config     pi mcp add|list|remove|login|logout
-p, --print                  one-shot, final text to stdout          --mode json|rpc       machine-readable
-c  continue last session    -r pick one    --no-session  --session-dir  --session <id>  --fork <id>  -n <name>
--model provider/id[:thinking]  --thinking <level>  --models <patterns>  --list-models [search]
-t, --tools a,b,c            allowlist (also +name / -name)    -xt, --exclude-tools    -nt  no tools    -nbt  no built-in tools
-e <path|npm:|git:|builtin:x>  extension (repeat)   --skill <path>   --prompt-template <path>   --theme <path>   --use-theme <name>
-ne -ns -np -nc --no-themes  turn off discovery of that kind          --no-mcp
--system-prompt <text|file>  --append-system-prompt <text|file>
-a/--approve  -na/--no-approve   project trust for this run            --offline   -v   -h
--export <session.jsonl> [out.html]
```
Env: `PI_CODING_AGENT_DIR` (agent dir) · `PI_CODING_AGENT_SESSION_DIR` · `PI_OFFLINE=1` · provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …).

## Settings you'll reach for (`settings.json`)

`defaultProvider` `defaultModel` `defaultThinkingLevel` · `theme` · `defaultTools` (`["+codemode"]` adds) · `extensions` `skills` `prompts` `themes` `packages` (paths relative
to the settings file) · `compaction.*` · `retry.*` · `sessionDir` · `enableSkillCommands` · `quietStartup` · `defaultProjectTrust` (user-level only).
Add `"$schema": "https://pi.dev/schemas/settings.schema.json"` for editor completion.
