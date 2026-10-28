# 06 · Themes

**Capability:** colors for the terminal UI and HTML exports. JSON only.

[`sample-sunset.json`](sample-sunset.json) is Pi's built-in `dark` theme with a warmer palette: only the shared
`vars` (and a couple of border roles) changed — roles like `accent`, selection and tool titles follow the variables.
It validates against Pi's published schema.

## Run (interactive — themes are visual)

```bash
scripts/pi-iso --theme examples/06-themes --use-theme sample-sunset
```

Or switch live: `/settings` → Theme. Edit the file and `/reload` to see changes.

## How it interacts

- Extensions draw with theme **roles** (`theme.fg("accent", …)`), not hard-coded colors, so every custom tool
  renderer in this repo ([07](../07-custom-tool/README.md)) re-colors with the theme.
- `"theme": "light/dark"` picks automatically from the terminal's appearance. Default `system` derives colors from your terminal.
- The full stack selects it in [`.pi/settings.json`](../../.pi/settings.json).

Pi docs: `docs/themes.md`, schema: `https://pi.dev/schemas/theme.schema.json`.
