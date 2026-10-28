# 01 · Trace (observe the lifecycle)

**Capability:** event subscription (`pi.on`) used purely for observation.
**Why it's here:** the best way to understand how Pi's pieces interact is to *watch the order things happen in*.
Load this next to any other example.

## Run

```bash
scripts/pi-iso -e examples/01-trace/trace.ts -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":6}'
cat .trace/events.log
```

Interactive: `scripts/pi-iso -e examples/01-trace/trace.ts` then type `/trace` to pin a live widget under the editor.

## Reading the log (a real run, annotated)

```
input                  source=interactive call roll_dice …   ← raw user text (input transforms run here)
before_agent_start                                           ← last chance to add prompt sections / tools
agent_start
turn_start                                                   ← TURN 1 = one model request …
context                1 messages                            ← message list about to be sent (system msg excluded)
before_provider_request                                      ← serialized payload; headers hook is just before
message_end            role=assistant                        ← model answered: contains a tool call
tool_execution_start   roll_dice
tool_call              roll_dice {"sides":6}                 ← THE GATE: block / edit input here
tool_result            roll_dice error=false                 ← redact / replace output here (NOT fired if blocked!)
tool_execution_end     roll_dice
message_end            role=toolResult
turn_end
turn_start                                                   ← TURN 2: results go back to the model
…
agent_end                                                    ← one low-level run ended (retries/queues may follow)
agent_before_settle / agent_settled                          ← settled = Pi will NOT continue on its own
```

Two things people trip over:
- `agent_end` is **not** "idle". Wait for `agent_settled`.
- A **blocked** tool call goes `tool_call` → `tool_execution_end` and **skips `tool_result`**.

Pi docs: `docs/extensions.md` ("Understand the runtime lifecycle").
