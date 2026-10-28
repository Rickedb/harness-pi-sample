# 05 · Skills (on-demand instructions + bundled files)

**Capability:** task-specific know-how the model loads *only when relevant*. Follows the open
[Agent Skills](https://agentskills.io/specification) format, so skills are portable across agents.

```
05-skills/
├── changelog-writer/            auto-discoverable skill
│   ├── SKILL.md                 frontmatter (name, description) + instructions
│   ├── scripts/git-log-summary.sh
│   └── references/style.md      read only when the instructions say so
└── release-checklist/           disable-model-invocation: true  → manual only
```

## How loading works (the important part)

1. At startup Pi puts **only `name` + `description` + path** into the system prompt. (Bodies cost nothing.)
2. When a task matches, the model **reads `SKILL.md`** with its normal `read` tool, then follows it — reading
   `references/` or running `scripts/` as instructed.
3. You can force it: `/skill:changelog-writer <request>` injects the body into your message.

So the **description is a routing rule**. "Helps with changelogs" routes badly; "Write a changelog entry from recent
git commits. Use when asked for release notes…" routes well.

## Run

```bash
scripts/pi-iso --skill examples/05-skills -p inspect                  # skill-changelog-writer marker present, release-checklist absent
scripts/pi-iso --skill examples/05-skills -p '/skill:release-checklist go'   # manual skill: body injected
scripts/pi-iso --skill examples/05-skills -p 'read examples/05-skills/changelog-writer/SKILL.md'   # what a real model would do
```

## How it interacts

- Skills ride on the built-in **`read` tool**: the model loads `SKILL.md` by reading it. If you run with a tool allowlist that excludes `read`, skills can't load.
- `disable-model-invocation: true` hides the skill from the prompt entirely (verified by `inspect`).
- Skills can run scripts → they're subject to the same tool gate ([09](../09-guardrails/README.md)) as any `bash` call.
- Ship skills in a package ([17](../17-packages/README.md)).

Pi docs: `docs/skills.md`.
