# 10 · Input transform

**Capability:** the `input` event sees the user's raw text before anything else touches it.

| Return | Effect | Demo |
|---|---|---|
| `{ action: "continue" }` | leave it | everything else |
| `{ action: "transform", text }` | rewrite the text and continue (attached images are kept) | `?quick what is a monad` |
| `{ action: "transform", text, images }` | rewrite the text **and** replace the images (`[]` drops them all) | `?text describe this` |
| `{ action: "handled" }` | swallow it — **no model call, no tokens** | `ping`, `time` |

These are all the actions Pi's `InputEventResult` allows. The event also gives you `source`, `images` and
`streamingBehavior` (`"steer"` / `"followUp"` while the agent is mid-run, `undefined` when idle) to decide with.

## Run

```bash
scripts/pi-iso -e examples/10-input-transform/input.ts -p '?quick what is a monad'    # mock echoes the rewritten prompt
scripts/pi-iso -e examples/10-input-transform/input.ts -p '?text describe this'         # transform + images: [] (attached images are dropped)
scripts/pi-iso -e examples/10-input-transform/input.ts -p 'ping'                       # prints nothing: handled locally (notify is a no-op in print mode)
scripts/pi-iso -e examples/10-input-transform/input.ts                                 # TUI: "ping" → pong toast, no model request
```

## How it interacts (ordering is the point)

```
user text ─▶ extension commands (/hello…) ─▶ `input` event ─▶ template/skill expansion ─▶ model
```

- `input` handlers run in extension **load order** and chain (later handlers see earlier rewrites); `handled` stops the chain —
  load [01 · trace](../01-trace/README.md) first if you want it to log input that others swallow.
- Messages that extensions inject (`sendUserMessage`) arrive with `source: "extension"`. Skip them to avoid loops.
- Great for: shortcuts, local answers, redacting pasted secrets, auto-prefixing prompts.

Pi docs: `examples/extensions/input-transform.ts`, `inline-bash.ts`.
