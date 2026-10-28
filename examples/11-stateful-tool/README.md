# 11 · Stateful tool (state that follows the conversation branch)

**Capability:** keep extension state in the session tree so `/tree`, `/fork`, `/resume` and `--continue` restore it correctly.

| Storage | Persisted | Sent to model | Follows branches | Used here |
|---|---|---|---|---|
| tool-result `details` | ✔ | ✘ (only `content`) | **✔** | notes list |
| `pi.appendEntry(type, data)` | ✔ | ✘ | ✔ (it's an entry) | audit trail |
| `pi.sendMessage()` | ✔ | ✔ | ✔ | — |
| a file / DB | ✔ | ✘ | ✘ | — |

The in-memory array in [notes.ts](notes.ts) is a **cache rebuilt from the active branch** on `session_start` and `session_tree`.

## Run

```bash
N=examples/11-stateful-tool/notes.ts
scripts/pi-iso -e $N -p 'call note {"action":"add","text":"buy milk"}'
scripts/pi-iso -c -e $N -p 'call note {"action":"add","text":"call mom"}'   # -c continues: output lists BOTH notes
```

Branching, interactively:
1. `scripts/pi-iso -e examples/11-stateful-tool/notes.ts`
2. `call note {"action":"add","text":"A"}` then `call note {"action":"add","text":"B"}` → `/notes` shows A, B
3. `/tree` → select the point right after "A" → `/notes` shows only **A**. (The "B" branch is still there to go back to.) `/fork` does the same into a new session file — `node` + RpcClient `fork()` verified: the forked session lists only `A`.

## How it interacts

- Why not a global variable / file? Because the user can rewind. State must be a function of the branch.
- `appendEntry` data is visible to *other* extensions via `ctx.sessionManager.getBranch()` and to RPC `get_entries`.
- Tool-result `details` are what [07](../07-custom-tool/README.md) renderers draw from.

Pi docs: `docs/extensions.md#state`, `docs/sessions.md`, `docs/session-format.md`, `examples/extensions/todo.ts`.
