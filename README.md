# harness-pi-sample

A hands-on tour of the **[Pi coding agent](https://pi.dev)**: one small, runnable example per capability, plus documentation on
how they interact. Pi is an intentionally minimal agent *harness* — a loop, a session tree, four tools — and everything else
(extensions, skills, prompt templates, themes, providers, MCP, packages) plugs in. Here each plug-in point is isolated so you can
see exactly what it does, then combined so you can see how they work together.

- **Works offline.** A scripted mock model stands in for the LLM: no API key, no cost, deterministic. Run the same stack on **Claude** with `scripts/pi-claude` ([how](docs/01-getting-started.md#using-claude-or-any-real-model)).
- **Hermetic.** Everything runs against `./.pi-agent-dir`; your real `~/.pi` is never touched.
- **Verified.** `npm run check` = typecheck + 45 smoke tests that exercise every example.
- Targets `@earendil-works/pi-coding-agent` **1.4.0** (pinned; the project moved from `@mariozechner/pi-coding-agent`).

## Quick start

```bash
npm install                                   # Node >= 22.19
npm run check                                 # everything green? then:

scripts/pi-iso -p inspect                     # ONE capability at a time (nothing loaded): what does Pi send the model?
scripts/pi-iso -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":6}'
scripts/pi-stack                              # the WHOLE stack, interactive (type: /trace, then  call roll_dice {"sides":20})
scripts/pi-claude                             # same stack on Claude  (cp .env.example .env  and set ANTHROPIC_API_KEY, or /login)
```

New here? Read **[docs/01-getting-started.md](docs/01-getting-started.md)** (10 min), then **[docs/02-how-it-fits-together.md](docs/02-how-it-fits-together.md)**.

## The examples

Ordered from least to most powerful — the same order Pi's docs recommend reaching for them.

| # | Example | Capability | Code? | Run |
|--:|---|---|:-:|---|
| 00 | [mock-provider](examples/00-mock-provider) | custom **provider**; offline scripted "LLM" | ✔ | `scripts/pi-iso -p inspect` |
| 01 | [trace](examples/01-trace) | observe the **event lifecycle** | ✔ | `scripts/pi-iso -e examples/01-trace/trace.ts` |
| 02 | [context-files](examples/02-context-files) | **AGENTS.md** hierarchy | – | `cd examples/02-context-files/nested && PI_ISO_CONTEXT=1 ../../../scripts/pi-iso -p inspect` |
| 03 | [system-prompt](examples/03-system-prompt) | **SYSTEM / APPEND_SYSTEM** | – | `scripts/pi-iso --append-system-prompt examples/03-system-prompt/append.md -p inspect` |
| 04 | [prompt-templates](examples/04-prompt-templates) | **prompt templates** with arguments | – | `scripts/pi-iso --prompt-template examples/04-prompt-templates -p '/review'` |
| 05 | [skills](examples/05-skills) | **skills** (on-demand instructions + files) | – | `scripts/pi-iso --skill examples/05-skills -p inspect` |
| 06 | [themes](examples/06-themes) | **themes** | – | `scripts/pi-iso --theme examples/06-themes --use-theme sample-sunset` |
| 07 | [custom-tool](examples/07-custom-tool) | model-callable **tools** | ✔ | `scripts/pi-iso -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":6}'` |
| 08 | [commands-flags-shortcuts](examples/08-commands-flags-shortcuts) | user-facing **commands, flags, shortcuts** | ✔ | `scripts/pi-iso -e examples/08-commands-flags-shortcuts/commands.ts` |
| 09 | [guardrails](examples/09-guardrails) | **gate** tool calls, **redact** results | ✔ | `scripts/pi-iso -e examples/09-guardrails/guardrails.ts -p 'write .env x'` |
| 10 | [input-transform](examples/10-input-transform) | rewrite / swallow **user input** | ✔ | `scripts/pi-iso -e examples/10-input-transform/input.ts -p '?quick hi'` |
| 11 | [stateful-tool](examples/11-stateful-tool) | **branch-aware state** (`/tree`, `/fork`) | ✔ | `scripts/pi-iso -e examples/11-stateful-tool/notes.ts` |
| 12 | [ui](examples/12-ui) | **status, widgets, dialogs** | ✔ | `scripts/pi-iso -e examples/12-ui/ui-demo.ts` |
| 13 | [prompt-hooks](examples/13-prompt-hooks) | edit **system prompt sections** & request context | ✔ | `scripts/pi-iso -e examples/13-prompt-hooks/prompt-hooks.ts -p inspect` |
| 14 | [event-bus](examples/14-event-bus) | **extensions cooperating** via `pi.events` | ✔ | see README |
| 15 | [dynamic-tools](examples/15-dynamic-tools) | change the **active tool set** at runtime | ✔ | `node examples/19-rpc/rpc-client.ts` |
| 16 | [mcp](examples/16-mcp) | **MCP** servers (hand-written, zero-dep) | ✔ | see README |
| 17 | [packages](examples/17-packages) | **Pi packages**: bundle & share | ✔ | `scripts/pi-iso -e examples/17-packages/pi-sample-bundle -p inspect` |
| 18 | [sdk](examples/18-sdk) | **SDK**: embed Pi in Node | ✔ | `node examples/18-sdk/01-minimal.ts` |
| 19 | [rpc](examples/19-rpc) | **RPC** mode from Node / raw / Python | ✔ | `node examples/19-rpc/rpc-raw.mjs` |
| 20 | [print-json-modes](examples/20-print-json-modes) | **print / JSON / export** for scripts & CI | – | `bash examples/20-print-json-modes/run-all.sh` |
| 21 | [your-first-extension](examples/21-your-first-extension) | guided exercise: write your own | ✔ | `scripts/pi-iso -e examples/21-your-first-extension/stamp.ts -p 'run echo hi'` |

### What each capability is for

The numbered table says *what* each example is; this section says *why you would reach for it*. The examples fall into
nine categories, roughly "change what the model knows" → "change what it can do" → "change how it's run".

**1. Foundations — run and observe (00, 01)**
- **00 mock-provider** — a custom *provider*: where the model's replies come from. Here it's a scripted fake, so every other
  example is free, offline and deterministic. Use the same hook to plug in a proxy, a local model or any non-built-in LLM API.
- **01 trace** — watches every lifecycle event without changing anything. Use it to learn the order things happen in, and to
  debug why another extension did (or didn't) fire. Load it next to any other example.

**2. Instructions — tell the model things, no code (02, 03, 04, 05)**
- **02 context-files** — `AGENTS.md` files, merged from parent directories into the system prompt. For standing rules about a
  project or folder ("use pnpm", "tests live in `test/`").
- **03 system-prompt** — `SYSTEM.md` replaces and `APPEND_SYSTEM.md` extends Pi's base prompt. For changing the agent's role or
  tone globally, rather than per-folder.
- **04 prompt-templates** — Markdown files that become `/commands` with arguments. For prompts you retype often (`/review`,
  `/explain topic`). *You* trigger them; the model doesn't choose.
- **05 skills** — instructions plus scripts and reference files that the model loads *only when relevant*. For deep, task-specific
  know-how that would bloat the prompt if always present. Portable across agents (Agent Skills format).

**3. Look and feel — the terminal UI (06, 12)**
- **06 themes** — JSON colour palettes for the TUI and HTML exports. Purely cosmetic.
- **12 ui** — status line, widgets, window title and dialogs (`ctx.ui`). For giving extensions a visible presence and asking the
  user questions; also shows which UI calls work in print, RPC and TUI modes.

**4. Model abilities — what the model can do (07, 15, 16)**
- **07 custom-tool** — your own model-callable tools with validated parameters. The basic way to give the agent a new action
  (query an API, roll dice, read a file with custom logic).
- **15 dynamic-tools** — change the active tool set mid-session (hide admin tools until asked, `/mode safe`). For least privilege
  and for keeping the tool list, and so the context, small.
- **16 mcp** — use tools from external Model Context Protocol servers instead of writing them in TypeScript. For reusing the
  existing MCP ecosystem or tools written in other languages.

**5. User controls — how *you* drive Pi (08, 10)**
- **08 commands-flags-shortcuts** — `/commands`, `--flags` and key bindings that run in-process; the model never sees them
  (unless a command deliberately sends a message). For deterministic actions that shouldn't cost a model call.
- **10 input-transform** — intercept the raw text you type: rewrite it, or swallow it with no model call. For aliases, shortcuts
  and trivial answers that don't need an LLM.

**6. Control and safety — steer what happens (09, 13)**
- **09 guardrails** — gate tool calls before they run and redact results before the model sees them. Pi has no permission prompts
  of its own, so this is how you add them. A speed bump, not a sandbox.
- **13 prompt-hooks** — edit system-prompt sections and the message list sent with each request (e.g. trim old tool output). For
  controlling exactly what the model sees and keeping context lean.

**7. State and cooperation — extensions that remember and coordinate (11, 14)**
- **11 stateful-tool** — keep state in the session tree so it follows `/tree`, `/fork` and `/resume` correctly. For anything that
  must stay consistent when you branch the conversation.
- **14 event-bus** — `pi.events` pub/sub so extensions react to each other without importing one another. For building small,
  independent extensions that compose.

**8. Distribution — share what you built (17)**
- **17 packages** — bundle extensions, skills, prompts and themes into one installable unit (npm, git or local path). For
  reusing a setup across projects or teams.

**9. Automation and embedding — Pi without the TUI (18, 19, 20)**
- **18 sdk** — run the agent loop inside your own Node program. For apps, services and tests that need an agent as a library.
- **19 rpc** — drive a long-lived Pi process over JSONL from any language (Node, Python, raw). For editor integrations and
  non-Node hosts.
- **20 print-json-modes** — one-shot output as text, a JSON event stream, or an HTML export. For shell scripts and CI.

**Bonus — learn by doing (21)**
- **21 your-first-extension** — a guided exercise: hook an event, register a command, then extend it with other plug-in points.

`.pi/` is the **combined** configuration (`scripts/pi-stack`): [settings.json](.pi/settings.json) lists the examples above,
[APPEND_SYSTEM.md](.pi/APPEND_SYSTEM.md) and [mcp.json](.pi/mcp.json) add the rest.

## Documentation

| Doc | Read it for |
|---|---|
| [docs/01-getting-started.md](docs/01-getting-started.md) | install, the three run modes, using a real model, project trust, file locations, troubleshooting |
| [docs/02-how-it-fits-together.md](docs/02-how-it-fits-together.md) | **the map**: what goes in a model request, event lifecycle, precedence rules, three end-to-end interactions |
| [docs/03-cheatsheet.md](docs/03-cheatsheet.md) | extension API, events by intent, modes matrix, CLI & settings quick reference |
| [docs/04-walkthroughs.md](docs/04-walkthroughs.md) | seven guided "what happens if…" exercises |
| each `examples/NN-*/README.md` | the concept, exact commands, expected output, how it interacts with the others |
| `node_modules/@earendil-works/pi-coding-agent/docs/` | Pi's official docs for the pinned version (offline) |

## Repo layout

```
AGENTS.md                 this repo's own instructions to coding agents (also demo material for example 02)
.pi/                      combined project config: settings.json, APPEND_SYSTEM.md, mcp.json
examples/NN-*/            one capability each (code + README)
docs/                     the written guide
scripts/                  pi-env · pi-iso · pi-stack · pi-claude · smoke.sh
.env                      optional, gitignored: ANTHROPIC_API_KEY (see .env.example)
.pi-agent-dir/ .sessions/ .trace/   generated at runtime (gitignored) - `rm -rf` them to reset
```

## Safety notes

Pi has **no sandbox and no built-in permission prompts**: tools run with your user's permissions, and extensions, skills, MCP servers and
packages are all code or instructions that act as you. The guardrails example is a speed bump, not a boundary. Review third-party
resources before installing them, grant project trust deliberately, and use a container or VM for untrusted or unattended work
(see Pi's `docs/security.md`). The examples in this repo are safe to run: they use a scripted model and only touch files under this directory
(plus the throw-away `/tmp` paths named in the guardrail demos, which are blocked or no-ops).
