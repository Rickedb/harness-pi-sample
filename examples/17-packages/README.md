# 17 · Pi packages (bundle and share)

**Capability:** distribute extensions + skills + prompts + themes as one unit, via npm, git, or a local path.

[`pi-sample-bundle/`](pi-sample-bundle) is an ordinary directory with a `package.json` that has a `pi` manifest:

```json
{ "name": "pi-sample-bundle", "keywords": ["pi-package"],
  "pi": { "extensions": ["./extensions"], "skills": ["./skills"], "prompts": ["./prompts"], "themes": ["./themes"] },
  "peerDependencies": { "@earendil-works/pi-coding-agent": "*", "typebox": "*" } }
```

(Without a `pi` key Pi falls back to the conventional `extensions/ skills/ prompts/ themes/` folders.)

## Run

```bash
# One-off (nothing is installed):
scripts/pi-iso -e examples/17-packages/pi-sample-bundle -p 'call bundle_greet {"name":"Ada"}'
scripts/pi-iso -e examples/17-packages/pi-sample-bundle -p inspect                     # package-skill marker present

# Install for real — into the hermetic agent dir, so your ~/.pi is untouched:
scripts/pi-env install ./examples/17-packages/pi-sample-bundle
scripts/pi-env list
cat .pi-agent-dir/settings.json                                                        # {"packages": ["../examples/17-packages/pi-sample-bundle"]}
scripts/pi-env remove ./examples/17-packages/pi-sample-bundle
```

Project-level install (`-l`) writes `.pi/settings.json` instead — that's how the full stack lists it.

## Sources

| Source | Example |
|---|---|
| npm | `pi install npm:@scope/name@1.2.3` |
| git | `pi install git:github.com/user/repo@v1` |
| local | `pi install ./path` (loaded in place, not copied) |
| one-off | `pi -e <any of the above>` |

## Gotchas

- **Do not** list Pi's own packages (`@earendil-works/*`, `typebox`) under `dependencies`; use `peerDependencies: "*"` — Pi supplies them, and a second copy breaks class identity.
- A package's extensions run with your permissions: read third-party packages before installing.
- Filter what loads per package in settings (`"extensions": ["!extensions/legacy.ts"]`) or interactively with `pi config`.
- Publishing to npm with the `pi-package` keyword lists it in the package gallery.

Pi docs: `docs/packages.md`.
