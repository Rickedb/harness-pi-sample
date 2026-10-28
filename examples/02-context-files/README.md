# 02 · Context files (`AGENTS.md`)

**Capability:** persistent, per-directory instructions. Zero code.
**Mechanism:** Pi walks from the working directory **up through its parents** (and `~/.pi/agent`) and appends every
`AGENTS.md` / `CLAUDE.md` it finds to the system prompt. `AGENTS.override.md` replaces them in the *same* directory.

```
examples/02-context-files/AGENTS.md          [marker:ctx-example-02]
examples/02-context-files/nested/AGENTS.md   [marker:ctx-example-02-nested]
```

## Run (the wrapper turns context loading off by default; `PI_ISO_CONTEXT=1` turns it on)

```bash
(cd examples/02-context-files        && PI_ISO_CONTEXT=1 ../../scripts/pi-iso -p inspect)
(cd examples/02-context-files/nested && PI_ISO_CONTEXT=1 ../../../scripts/pi-iso -p inspect)
```

Expected output (outermost file first — the walk goes all the way up to the repo root):

```
markers found in system prompt: root-agents-md, ctx-example-02
markers found in system prompt: root-agents-md, ctx-example-02, ctx-example-02-nested
```

`root-agents-md` is this repo's own [AGENTS.md](../../AGENTS.md) — it applies because these directories are *below* it.

## How it interacts

- Context files load **even without project trust** (they're plain text). Treat them as untrusted input.
- They are *additive* with `.pi/APPEND_SYSTEM.md` ([03](../03-system-prompt/README.md)); `SYSTEM.md` replaces the base prompt, not context files.
- Disable with `-nc` / `--no-context-files`.

Pi docs: `docs/configuration.md#context-files`.
