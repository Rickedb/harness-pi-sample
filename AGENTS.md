# harness-pi-sample - repo instructions

[marker:root-agents-md]

This repo is a teaching sample for the Pi coding agent (`@earendil-works/pi-coding-agent`, pinned in
`package.json`). Each folder under `examples/` demonstrates ONE capability; `.pi/` wires them all together.

## Conventions when adding or changing an example

- One capability per folder, numbered `NN-name/`. Every folder has a `README.md` with: what it shows,
  the exact command to run it (isolated), what to expect, and how it interacts with the other examples.
- Extensions are single TypeScript files with a header comment explaining the concept and a "Try:" line.
  Keep them short and readable; this is documentation first.
- Tag anything that should be visible in the system prompt with a marker tag (square brackets around `marker:` + a unique name) so the mock
  model's `inspect` command can prove it arrived.
- Never hard-code API keys. Everything must run offline against the mock model by default.
- Verify with `npm run check` (typecheck + smoke tests) before finishing.

## Commands

- `npm run check`        typecheck + smoke tests
- `scripts/pi-iso ...`   one capability at a time (see docs/01-getting-started.md)
- `scripts/pi-stack`     everything together
