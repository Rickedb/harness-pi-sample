# 07 · Custom tools (give the model new abilities)

**Capability:** `pi.registerTool()` / `defineTool()` — name + description + TypeBox schema + `execute()`.

| Tool | Shows |
|---|---|
| `roll_dice` | pure tool, validated params, structured `details`, custom `renderCall`/`renderResult`, `promptGuidelines` |
| `file_stats` | filesystem access via `ctx.cwd`, progress via `onUpdate`, **throwing** to report failure |

## Run

```bash
scripts/pi-iso -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":6,"count":2}'
scripts/pi-iso -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":1}'          # schema rejects it
scripts/pi-iso -e examples/07-custom-tool/tools.ts -p 'call file_stats {"path":"nope.txt"}' # thrown error → error result
scripts/pi-iso -e examples/07-custom-tool/tools.ts -p inspect                               # tool + guideline are in the request
```

## The mental model

```
model ──toolCall(name, args)──▶ Pi validates args against the schema ──▶ tool_call hooks ──▶ execute()
model ◀── content (text the MODEL sees) ── tool_result hooks ◀── { content, details }
                                              details = for UI/state only, never sent to the model
```

- **Description = prompt.** The model decides *whether and how* to call the tool from `description`, the schema's
  field descriptions, and `promptSnippet` / `promptGuidelines` (which land in the system prompt — see the marker).
- **Validation is free:** bad arguments never reach `execute()`; the model gets the validation message and retries.
- **Errors:** `throw` → the model receives `isError: true` and can adapt. Returning an object is *always* success.
- Tool results are plain content, so a later hook can rewrite them ([09](../09-guardrails/README.md)).
- Tools can be hidden/shown at runtime ([15](../15-dynamic-tools/README.md)) and keep branch-aware state ([11](../11-stateful-tool/README.md)).

Pi docs: `docs/extensions.md#tools`, `examples/extensions/hello.ts|todo.ts|truncated-tool.ts` in the Pi package.
