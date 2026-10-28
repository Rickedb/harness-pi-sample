# Getting started

## Prerequisites

- **Node.js ≥ 22.19** (`node --version`). Nothing else: Pi is installed *locally* as a pinned dev dependency.
- No API key needed — every example runs against an offline, scripted [mock model](../examples/00-mock-provider/README.md).

```bash
npm install            # installs @earendil-works/pi-coding-agent 1.4.0 (pinned) + TypeScript for type-checking
npm run check          # typecheck + 45 smoke tests, all offline (~30 s). If this is green, everything below works.
```

> **Which package?** Pi's coding agent moved from `@mariozechner/pi-coding-agent` (0.x) to **`@earendil-works/pi-coding-agent`**
> (1.x). This repo targets the latter. Pi's own docs ship inside the package:
> `node_modules/@earendil-works/pi-coding-agent/docs/` — every example README links to the relevant page by name.

## The three ways to run Pi here

All three go through `scripts/pi-env`, which sets `PI_CODING_AGENT_DIR=./.pi-agent-dir`. That makes the sample **hermetic**:
your real `~/.pi` (credentials, global extensions, sessions) is neither read nor modified. Set `PI_USE_HOME=1` to opt out.

| Command | What is loaded | Use it to |
|---|---|---|
| `scripts/pi-iso [pi args]` | **Nothing** (no extensions, skills, templates, themes, context files, project config) + the mock model | learn one capability at a time: you add exactly one thing with `-e`, `--skill`, `--prompt-template`… |
| `scripts/pi-stack [pi args]` | The repo's whole `.pi/` config: all examples wired together | see how the pieces interact |
| `scripts/pi-claude [pi args]` | Same as `pi-stack`, on **Claude** (needs `ANTHROPIC_API_KEY` or `/login`) | try the real thing |
| `scripts/pi-env [pi args]` | Whatever Pi would normally discover, but in the hermetic dir | `pi install`, `pi list`, `pi mcp …`, anything else |

`npm run pi:iso -- …`, `npm run pi:stack -- …` and `npm run pi -- …` are the same thing.

```bash
scripts/pi-iso -p hello                                                  # one-shot (print mode) against the mock model
scripts/pi-iso -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":6}'
scripts/pi-iso                                                           # interactive TUI, mock model, nothing loaded
scripts/pi-stack                                                         # interactive TUI, everything loaded
```

### What `pi-iso` actually passes

```
-na  don't load trust-gated project files (.pi/…)     -ne  no extensions        -ns  no skills
-np  no prompt templates       -nc  no AGENTS.md       --no-themes
-e examples/00-mock-provider/mock-provider.ts  --model mock/scripted  --session-dir ./.sessions
```

You then add resources back explicitly. Later flags win, which is why `pi-iso -a …` (approve project config) works for the MCP example.

## Talking to the mock model

It is a regex-driven stand-in — see [its README](../examples/00-mock-provider/README.md). The three things you need:

```text
inspect                           what did Pi put in the model request? (system-prompt size, [marker:*] tags, tools, messages)
call <tool> {"json":"args"}       call any tool by name (yours, MCP, package…)
run <cmd> · read <path> · write <path> <text>     built-in tools
```

## Interactive cheat-sheet

| Do | Type / press |
|---|---|
| send / newline | `Enter` / `Shift+Enter` |
| see commands | `/` (menu includes your extension commands, templates and `/skill:*`) |
| include a file | `@` then pick, or `Tab` to complete a path |
| run a shell command into the chat | `!git status` (`!!` = don't send output to the model) |
| expand tool output / thinking | `Ctrl+O` / `Ctrl+T` |
| interrupt · queue follow-up | `Esc` · `Alt+Enter` |
| reload edited extensions, skills, templates, themes | `/reload` |
| settings · model · login | `/settings` · `/model` · `/login` |
| branch the conversation | `/tree` (navigate) · `/fork` · `/clone` |
| resume / continue | `/resume` · `pi --continue` |
| keys in your terminal | `/hotkeys` |

## Using Claude (or any real model)

Pi has Anthropic built in — no extension needed. You just need credentials and a model name.

**1. Credentials** — two different things, with different billing:

| | How | Billing |
|---|---|---|
| **API key** | `cp .env.example .env` and set `ANTHROPIC_API_KEY=sk-ant-…` (gitignored; loaded by `scripts/pi-env`), or `export` it | pay-per-token on your Anthropic API account |
| **Claude subscription** (Pro/Max) | `scripts/pi-env`, type `/login`, choose Anthropic, approve in the browser. Token (`sk-ant-oat…`) is stored in `./.pi-agent-dir/auth.json` (gitignored). Headless/SSH: paste the redirected URL back into Pi | ⚠ see below |

> ⚠ **Subscription login works, but it does not use your plan's limits.** Pi shows this warning whenever subscription auth is active:
> *"Third-party harness usage draws from extra usage and is billed per token, not your Claude plan limits. Manage extra usage at https://claude.ai/settings/usage."*
> That is Pi's statement about Anthropic's rules, which I haven't independently verified — check your plan's current terms and the usage page before relying on it.
> In practice: subscription auth is a convenient login (no key to manage), but expect per-token "extra usage" charges, and it may fail if extra usage isn't enabled on your account.
> The warning can be turned off in `/settings` ("Anthropic extra usage") or with `warnings.anthropicExtraUsage: false`; that hides the notice, not the charge.

**2. Run**

```bash
scripts/pi-claude                                  # the WHOLE stack on Claude (default model: claude-sonnet-5-5)
scripts/pi-claude -p "roll two d20 and note the total"
CLAUDE_MODEL=claude-opus-5-5 scripts/pi-claude     # pick another Claude model
PI_MODEL=claude scripts/pi-iso -e examples/07-custom-tool/tools.ts     # ONE capability on Claude
npm run pi:claude                                  # same as scripts/pi-claude
```

Models Pi 1.4.0 knows for Anthropic: `scripts/pi-env --list-models anthropic` (e.g. `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-haiku-5-5`, 4.x versions too).
Any other provider works the same way: `PI_MODEL=<provider>/<model-id> scripts/pi-stack` (keys: table in `docs/providers.md` in the Pi package).
If credentials are missing the wrapper stops immediately with instructions (it uses `pi auth check`, a local check — no network call).

**3. What changes when the decision-maker is real**

- `call roll_dice {…}` and `inspect` were mock-only shortcuts. Talk normally — *"roll two d20 and add the total as a note"* — and Claude picks `roll_dice`
  then `note` itself. The tools, gates, hooks, skills, MCP and UI are exactly the same code paths.
- Skills now really route on their descriptions: *"write release notes from the recent commits"* should make Claude `read` the `changelog-writer` SKILL.md.
- Guardrails matter more: ask *"delete the tmp folder"* and watch [09](../examples/09-guardrails/README.md) intercept `rm -rf`.
- `inspect` is gone, but `/session` (tokens, cost), the footer's context meter and the [trace](../examples/01-trace/README.md) show what happened;
  the system prompt is visible with `ctx.getSystemPrompt()` (try `/session-info` from [08](../examples/08-commands-flags-shortcuts/README.md)).
- It costs money either way: per-token on an API key, or per-token "extra usage" with subscription auth (see the warning above) — not your plan's included limits. The stack's prompt is ≈ 6k chars + 12 tool schemas per request, so prefer a smaller model (`CLAUDE_MODEL=claude-haiku-5-5`) while experimenting.
- Thinking level: `/thinking` or `--thinking <level>`.

Already logged in with your own Pi? `PI_USE_HOME=1 scripts/pi-claude` reuses `~/.pi/agent` credentials (and also loads your global extensions).
The mock-provider extension stays loaded harmlessly, so you can switch back with `/model mock/scripted`.

## Project trust (why you may see a prompt)

Pi refuses to load executable project config until you approve the folder. A directory is "protected" if it contains `.pi/settings.json`,
`.pi/mcp.json`, `.pi/extensions|skills|prompts|themes`, or `.pi/(APPEND_)SYSTEM.md`. `AGENTS.md` is *not* protected (but is still untrusted text).

| Situation | Behaviour |
|---|---|
| interactive, no saved decision | Pi asks; `/trust` saves the answer in `<agent-dir>/trust.json` |
| `-a` / `--approve` | trust for this run (`pi-stack` uses it) |
| `-na` / `--no-approve` | ignore project config for this run (`pi-iso` uses it) |
| print / JSON / RPC, no flag | project config is **skipped** unless `defaultProjectTrust: "always"` in user settings |

## Where things live

| Thing | Project (needs trust) | User (`<agent-dir>`, default `~/.pi/agent`) | CLI one-off |
|---|---|---|---|
| settings | `.pi/settings.json` | `settings.json` | — |
| extensions | `.pi/extensions/` | `extensions/` | `-e path` |
| skills | `.pi/skills/` | `skills/` | `--skill path` |
| prompt templates | `.pi/prompts/` | `prompts/` | `--prompt-template path` |
| themes | `.pi/themes/` | `themes/` | `--theme path` |
| MCP servers | `.pi/mcp.json` | `mcp.json` | `-e builtin:mcp` |
| system prompt | `.pi/SYSTEM.md` · `APPEND_SYSTEM.md` | same names | `--system-prompt` · `--append-system-prompt` |
| context files | `AGENTS.md` / `CLAUDE.md` in cwd **and every parent** | same names | `-nc` disables |
| credentials | — | `auth.json` | `--api-key` |
| sessions | — | `sessions/` | `--session-dir`, `--no-session` |

This repo uses the settings-file form: [.pi/settings.json](../.pi/settings.json) *points at* the example folders, so each example
exists once and works both isolated and in the stack.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `pi -p …` hangs forever in a script/CI | stdin is an open pipe; print mode waits for EOF to prepend it. Add `</dev/null`. |
| An extension/skill/template you added doesn't show up | Interactive: `/reload`. Project files: needs trust (`-a`). Skills: check the startup diagnostics for a frontmatter warning (name rules: lowercase, digits, hyphens; description required). |
| `Error: Unknown option` for `-e` path | Flags must be separate argv entries; in zsh `$VAR` isn't word-split — use arrays or `${=VAR}`. |
| Edited extension "doesn't change" | `/reload`, or restart. Extensions are TS loaded via jiti — there is no build step and no stale `dist/`. |
| Hook never fires with a custom provider | The provider must call `options.onPayload` / `options.onResponse` (see [00](../examples/00-mock-provider/README.md)). |
| A `tool_result` handler didn't see a call | The call was blocked by a `tool_call` handler — blocked calls skip `tool_result`. |
| MCP tools missing | `-a` (trust), `-e builtin:mcp` under `pi-iso`, correct relative `args` path, and check `/mcp` for the server's error. |
| Messy state | `rm -rf .sessions .trace .pi-agent-dir` resets everything this sample writes. |
| Weird colors | `scripts/pi-iso --use-theme dark` (or `system`, the default, derives from your terminal). |

Next: [How the pieces fit together →](02-how-it-fits-together.md)
