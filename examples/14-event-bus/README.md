# 14 · Event bus (extensions cooperating)

**Capability:** `pi.events` — a tiny pub/sub shared by all loaded extensions.

```
                       emits "guardrails:blocked"
09-guardrails ───────────────────────────────────────┬──▶ audit-log.ts        → .trace/audit.jsonl
(knows nothing about the listeners)                  └──▶ blocked-counter.ts  → footer badge "🛡 N blocked"
```

Neither listener imports the producer, and the producer doesn't know they exist. The only coupling is the
**event name + payload shape**, documented at the top of each file.

## Run

```bash
BUS="-e examples/09-guardrails/guardrails.ts -e examples/14-event-bus/audit-log.ts -e examples/14-event-bus/blocked-counter.ts"
scripts/pi-iso $BUS -p 'write .env x' ; scripts/pi-iso $BUS -p 'run echo AKIAABCDEFGHIJKLMNOP'
cat .trace/audit.jsonl                  # one "blocked" line, one "redacted" line
scripts/pi-iso $BUS                      # TUI: run rm -rf /tmp/zz → answer No → footer badge appears
```

Remove one `-e` and the system still works — that's the point. Load only `guardrails.ts` and nothing audits; load only a listener and nothing happens.

## Rules

- **No replay**: a listener registered after the event fires misses it. Subscribe in the factory.
- Handlers are notifications — don't block in them.
- Treat the payload as a **public API**: version it, e.g. `"guardrails:blocked"` → `"guardrails:blocked:v2"`.
- Bus (extension ↔ extension, same process) vs. session entries (`appendEntry`, durable) vs. RPC events (to an external client): pick by who needs to know.

Pi docs: `examples/extensions/event-bus.ts`.
