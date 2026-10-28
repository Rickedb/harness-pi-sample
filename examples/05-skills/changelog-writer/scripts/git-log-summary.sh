#!/usr/bin/env bash
# Print one line per commit since the latest tag (or all commits if there is none).
set -euo pipefail
last_tag="$(git describe --tags --abbrev=0 2>/dev/null || true)"
range="${last_tag:+$last_tag..}HEAD"
git log --no-merges --pretty='- %s' "$range"
