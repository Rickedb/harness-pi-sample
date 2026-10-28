# Walkthroughs: seeing the pieces interact

Seven short exercises, each answers "what happens if…?". The first four use the **whole stack**
(`scripts/pi-stack`, mock model, interactive). Ablations (5–6) use `pi-iso` to add pieces back one at a time.
Every command here is verified; expected output is shown where it's deterministic.

> Tip: open a second terminal on `tail -f .trace/events.log` — the [trace](../examples/01-trace/README.md) shows each step as it happens.

---

## 1 · What did Pi actually send the model?

```bash
scripts/pi-iso -p inspect          # baseline
scripts/pi-stack -p inspect        # everything loaded
```

| | system prompt | tools | markers |
|---|---|---|---|
| baseline | ≈ 2.8k chars | 4 | none |
| stack | ≈ 5.9k chars | 12 | `root-agents-md`, `project-append-system`, `skill-changelog-writer`, `package-skill`, `tool-roll-dice`, `prompt-hooks-facts` |

Every marker is one plug-in point talking: AGENTS.md ([02](../examples/02-context-files/README.md)), APPEND_SYSTEM.md ([03](../examples/03-system-prompt/README.md)),
two skills ([05](../examples/05-skills/README.md), [17](../examples/17-packages/README.md)), a tool guideline ([07](../examples/07-custom-tool/README.md)), a prompt hook ([13](../examples/13-prompt-hooks/README.md)).
Not there: `release-checklist` (a manual-only skill) — hiding it is a feature.

## 2 · Follow one tool call

```bash
scripts/pi-stack
```
```text
/trace                                       ← pins a live event list under the editor
call roll_dice {"sides":20}
```
You'll see the custom renderer (`🎲 …`), the footer `1 turn(s) · 1 tool call(s)` and widget `last tool: roll_dice` from [12 · UI](../examples/12-ui/README.md), and in the trace
the sequence `input → before_agent_start → … → tool_call → tool_result → … → agent_settled`. Two turns: the model asked, then answered after the result.

Now `call file_stats {"path":"nope.txt"}` — the tool *throws*, the model gets an error result, the transcript shows it in red. Errors are data, not crashes.

## 3 · Hit a guardrail and watch three extensions react

In `scripts/pi-stack`:
```text
run rm -rf /tmp/zz-sample
```
1. [09 guardrails](../examples/09-guardrails/README.md) pops a **Yes/No** dialog (`tool_call` gate). Choose **No**.
2. The model receives `Blocked by the user` and says so.
3. The footer badge becomes `🛡 1 blocked` ([14 blocked-counter](../examples/14-event-bus/blocked-counter.ts)), and `.trace/audit.jsonl` gains a line ([14 audit-log](../examples/14-event-bus/audit-log.ts)).
4. In the trace: `tool_call` then straight to `tool_execution_end` — **no `tool_result`**.

Then, still in the TUI: `run echo "key=AKIAABCDEFGHIJKLMNOP"` → the model's view is `key=[REDACTED:aws-key]`; press `Ctrl+O` to see the
(unredacted, local) command and the redacted result the model got. The same rule, a different hook (`tool_result`).

Same guardrail, no UI: `scripts/pi-stack -p 'run rm -rf /tmp/zz'` is **blocked** (fail closed). Over RPC your client answers the dialog:
`node examples/19-rpc/rpc-raw.mjs` (approve) / `… deny`.

## 4 · Text transformations before the model

In `scripts/pi-stack`:

| Type | What happens |
|---|---|
| `ping` | `pong` toast. No model request ([10](../examples/10-input-transform/README.md) returned `handled`) |
| `?quick why is the sky blue` | rewritten to "Answer in one or two sentences: …" — the mock echoes the rewrite |
| `/explain src/index.ts deep "mind the edge cases"` | template expansion ([04](../examples/04-prompt-templates/README.md)); mock echoes the expanded prompt |
| `/skill:release-checklist go` | skill body injected into your message ([05](../examples/05-skills/README.md)) |
| `/hello Pi` | extension command; the model never sees it ([08](../examples/08-commands-flags-shortcuts/README.md)) |

Order of processing: **command → `input` event → template/skill expansion → model**. Confirm with the trace: the `input` line shows
the text *before* expansion.

## 5 · Ablation: what does each piece contribute?

Add pieces one at a time and re-run the same prompt:

```bash
G=examples/09-guardrails/guardrails.ts; A=examples/14-event-bus/audit-log.ts
rm -rf .trace
scripts/pi-iso -e $G -p 'write .env x'           # blocked… and nobody is told: no audit file
ls .trace 2>&1 | head -1                          #   → No such file
scripts/pi-iso -e $G -e $A -p 'write .env x'      # add ONE listener → audit appears, guardrail code unchanged
cat .trace/audit.jsonl
scripts/pi-iso -e $A -p 'write .env x'            # listener alone: nothing blocks (write goes through!) and nothing is audited
rm .env 2>/dev/null; true
```
Lesson: a *gate* and its *observers* are independent; the bus is the only coupling.

## 6 · Time travel and tool sets

**Branch-aware state** ([11](../examples/11-stateful-tool/README.md)) in `scripts/pi-stack`:
```text
call note {"action":"add","text":"A"}
call note {"action":"add","text":"B"}
/notes                    → 1. A  2. B
/tree                     → pick the entry right after "A"
/notes                    → 1. A          (B still exists on the other branch)
```
**Tools that appear on demand** ([15](../examples/15-dynamic-tools/README.md)):
```text
inspect                           → no admin_* tools
call unlock_admin_tools {}
inspect                           → admin_reset_cache, admin_rotate_logs now declared
/mode safe                        → only read/grep/find/ls
inspect                           → bash/edit/write gone; try `run echo hi` → the model can't
```

## 7 · Write the extension yourself

Do [21 · your first extension](../examples/21-your-first-extension/README.md): a `tool_result` hook plus a command in 20 lines, then
extend it into a gate, a tool, and an event-bus participant. Add it to the stack by listing it in [.pi/settings.json](../.pi/settings.json) and `/reload`.

---

## Where to go next

- Switch from the mock to a real model — `PI_MODEL=<provider>/<id> scripts/pi-stack` — and ask in plain language: *"roll two d20 and note the total"*. Watch the model chain `roll_dice` → `note` on its own.
- Read Pi's own bigger examples (`node_modules/@earendil-works/pi-coding-agent/examples/extensions/`): `plan-mode/`, `subagent/`,
  `permission-gate.ts`, `custom-compaction.ts`, `sandbox/`, `ssh.ts`. Pi deliberately ships **without** sub-agents or plan mode; these show how you'd add them.
- Containers/VMs for untrusted work: `docs/containerization.md` and `docs/security.md` in the Pi package.
