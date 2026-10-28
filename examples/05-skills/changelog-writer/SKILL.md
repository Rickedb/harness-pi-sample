---
name: changelog-writer
description: Write a user-facing changelog entry from recent git commits. Use when asked for release notes, a changelog, or "what changed". [marker:skill-changelog-writer]
---

# Changelog writer

1. Run `scripts/git-log-summary.sh` (relative to this skill directory) to list commits since the last tag.
2. Read `references/style.md` and follow it exactly.
3. Group entries under Added / Changed / Fixed and omit empty groups.
