# 21 · Your first extension (a guided exercise)

**Capability:** the two moves behind almost every extension — *hook an event*, *register a command*.

[stamp.ts](stamp.ts) is 20 lines: a `tool_result` hook that prefixes `bash` output with a timestamp, and a `/stamped` counter.

## Run

```bash
scripts/pi-iso -e examples/21-your-first-extension/stamp.ts -p 'run echo hello'     # → [18:05:30] hello
scripts/pi-iso -e examples/21-your-first-extension/stamp.ts                          # TUI: run echo hi ; /stamped
```

## Make it yours (each step is a different plug-in point from this repo)

1. **Change the hook.** Stamp `read` results too (`event.toolName === "read"`). Run `/reload` in the TUI — no restart, no build.
2. **Make it a gate.** Add `pi.on("tool_call", …)` that returns `{ block: true, reason: "no network" }` when `event.input.command` contains `curl`.
   Confirm with [01 · trace](../01-trace/README.md) that blocked calls never reach `tool_result` — your counter won't move.
3. **Make it a tool.** Copy `roll_dice` from [07](../07-custom-tool/tools.ts) and call it from the mock: `call my_tool {…}`.
4. **Make it cooperate.** `pi.events.emit("stamp:done", …)` and add a listener in a second file ([14](../14-event-bus/README.md)).
5. **Type-check it.** `npm run typecheck` (files under `examples/` are included automatically).
6. **Test it offline.** Add a line to [scripts/smoke.sh](../../scripts/smoke.sh) — the mock model makes extension tests deterministic.
7. **Package it.** Move it into a folder with a `package.json` + `pi` manifest ([17](../17-packages/README.md)).

## Dev-loop cheat-sheet

| Task | How |
|---|---|
| try a file | `pi -e ./file.ts` (jiti compiles TypeScript on the fly) |
| iterate | edit, then `/reload` |
| see what happens | load [01 · trace](../01-trace/trace.ts) alongside |
| see what the model got | the mock model's `inspect` |
| catch type errors | `npm run typecheck` |
| unit-test logic | export pure functions; run the rest through `pi-iso -p` in smoke.sh |
