# 16 · MCP (Model Context Protocol servers → tools)

**Capability:** connect external tool servers (stdio or streamable HTTP). Their tools become `mcp__<server>__<tool>`.

| File | Role |
|---|---|
| [server.mjs](server.mjs) | a complete MCP server in ~70 lines, **zero dependencies** (`reverse_text`, `utc_now`, `add`) — read it to see the protocol |
| [project/.pi/mcp.json](project/.pi/mcp.json) | the client-side config: how Pi launches it and how its tools are exposed |

## Run

```bash
cd examples/16-mcp/project
../../../scripts/pi-iso -a -e builtin:mcp -p 'call mcp__sample__reverse_text {"text":"pi agent"}'     # → tnega ip
../../../scripts/pi-iso -a -e builtin:mcp -p 'call mcp__sample__add {"a":2,"b":40}'                    # → 42
../../../scripts/pi-iso -a -e builtin:mcp                                                              # TUI: /mcp shows servers, tools, state
```

Why the flags: `-a` approves the project's `.pi/mcp.json` (protected by *project trust*); `-e builtin:mcp` turns the built-in MCP
client back on, since the wrapper disables all extensions. Run `cd` first so the server's relative path resolves.

Raw protocol check (no Pi involved):
```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node examples/16-mcp/server.mjs
```

## Exposure — the setting that matters

`"exposure"` decides how the model reaches the server's tools:

| Value | Model sees | Use for |
|---|---|---|
| `direct` | each tool declared like a built-in (**used here**) | small, frequently used servers |
| `codemode` (default) | nothing declared; scripts call them via the `codemode` tool | big servers; combining/filtering calls |
| `deferred` | nothing until `tool_search` loads a match | huge servers |
| `hidden` | unreachable | switch-off |

## How it interacts

- MCP tools go through the **same** `tool_call`/`tool_result` hooks as built-ins ([09](../09-guardrails/README.md)); MCP tool annotations
  (`readOnlyHint` etc., set in server.mjs) are available to a permission extension via `pi.getAllTools()`.
- Extensions can add servers in code: `pi.registerMcpServer(name, config)` ([docs/extensions.md](../../node_modules/@earendil-works/pi-coding-agent/docs/extensions.md)).
- In the full stack the same server is configured at the repo root: [`.pi/mcp.json`](../../.pi/mcp.json).
- `pi mcp add|list|remove|login` manage servers from the shell; OAuth for remote servers is built in.

Pi docs: `docs/mcp.md`.
