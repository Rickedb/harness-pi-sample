# 20 · Print, JSON and export (non-interactive Pi)

**Capability:** run Pi in scripts and CI.

| Mode | Command | Output |
|---|---|---|
| print | `pi -p "prompt"` | final answer text on stdout, then exit |
| JSON | `pi --mode json "prompt"` | every agent event as one JSON object per line |
| RPC | `pi --mode rpc` | bidirectional protocol → [19](../19-rpc/README.md) |
| export | `pi --export session.jsonl out.html` | standalone HTML of a saved session |

Piped stdin and `@file` arguments are folded into the first prompt.

## Run

```bash
bash examples/20-print-json-modes/run-all.sh
```

It runs five small demos: print, stdin piping, `@file`, JSON-mode event counting, and HTML export. Read the script — it's the documentation.

## Practical recipes

```bash
git diff --staged | pi -p "Write a commit message for this diff"
pi -p --tools read,grep,find,ls "Where is authentication handled?"     # read-only run
pi --mode json "…" | jq -c 'select(.type=="tool_execution_start") | .toolName'
pi -p --no-session "…"                                                 # leave no session file behind
```

## ⚠ The stdin trap

If stdin is an **open pipe that never closes** (some CI runners, `docker exec` without `-i` handled, tool harnesses), print mode waits
for EOF so it can prepend that input — and *hangs*. Fix: `pi -p "…" </dev/null`. (All commands in this repo's smoke tests do this.)

## How it interacts

- Extensions load in every mode, but UI calls are no-ops in print/JSON. [09 · guardrails](../09-guardrails/README.md) therefore **blocks** dangerous commands there (fail closed).
- Project resources need trust; non-interactive runs can't ask. Use `-a` (approve) / `-na` (don't), or `defaultProjectTrust` in user settings.

Pi docs: `docs/cli.md`, `docs/json.md`, `docs/cli-integration.md`.
