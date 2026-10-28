# 13 · Prompt hooks (shape what the *model* sees)

**Capability:** `before_agent_start` (system-prompt sections) and `context` (message list per request).

[prompt-hooks.ts](prompt-hooks.ts) does two things:
1. adds a `project_facts` section (date + cwd) → visible via the `prompt-hooks-facts` marker;
2. in each request, **trims bulky old tool results** (the session and TUI keep the full text).

## Run

```bash
H=examples/13-prompt-hooks/prompt-hooks.ts
scripts/pi-iso -e $H -p inspect                                   # marker present

# Trimming: two runs in one session. Compare "message chars" with and without the hook.
rm -rf .sessions
scripts/pi-iso -c -e $H -p 'run seq 1 400' >/dev/null;  scripts/pi-iso -c -e $H -p inspect | grep 'message chars'   # ≈ 2.5k
rm -rf .sessions
scripts/pi-iso -c    -p 'run seq 1 400' >/dev/null;  scripts/pi-iso -c    -p inspect | grep 'message chars'         # ≈ 4.3k
```

## Choosing the right hook

| You want to… | Use |
|---|---|
| add instructions / facts for this run | `before_agent_start` → `systemPromptOptions.sections.<name>` (cache-friendly) |
| change which tools are active for this run | `before_agent_start` or `pi.setActiveTools` ([15](../15-dynamic-tools/README.md)) |
| prune / rewrite history *for the request only* | `context` |
| edit the raw HTTP payload or headers | `before_provider_request`, `before_provider_headers` |
| change what is **stored** | not these — use `tool_result` / `message_end` |

## How it interacts

- Sections stack with `AGENTS.md` ([02](../02-context-files/README.md)), `APPEND_SYSTEM.md` ([03](../03-system-prompt/README.md)),
  skill listings ([05](../05-skills/README.md)) and tool guidelines ([07](../07-custom-tool/README.md)): they're all just parts of one prompt.
- `context` runs on **every turn** of a run, including the turns after tool calls. Keep it cheap and idempotent.

Pi docs: `docs/extensions.md` (events), `docs/compaction.md` (the built-in way to shrink history), `examples/extensions/prompt-customizer.ts`.
