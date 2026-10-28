#!/usr/bin/env bash
# Non-interactive Pi: print mode, stdin piping, @file arguments, JSON event stream, HTML export.
# Run from anywhere:  bash examples/20-print-json-modes/run-all.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PI="$ROOT/scripts/pi-iso"
cd "$ROOT"
rm -rf .sessions

echo "### 1. print mode: run once, final answer on stdout"
"$PI" -p "inspect" </dev/null | head -3

echo; echo "### 2. piped stdin is PREPENDED to the prompt (this is why an open stdin pipe makes Pi wait)"
echo "diff --git a/x b/x" | "$PI" -p "review this:" | head -1

echo; echo "### 3. @file puts a file's contents into the prompt"
"$PI" -p @AGENTS.md "what is attached?" </dev/null | head -1 | cut -c1-110

echo; echo "### 4. JSON mode: every agent event as one JSON object per line (JSONL)"
"$PI" --mode json "run echo hi" </dev/null > .sessions/events.jsonl
node -e '
  const lines = require("fs").readFileSync(".sessions/events.jsonl", "utf8").trim().split("\n").map(JSON.parse);
  const counts = {};
  for (const e of lines) counts[e.type] = (counts[e.type] ?? 0) + 1;
  console.log(counts);
'
rm -f .sessions/events.jsonl

echo; echo "### 5. export a saved session to a standalone HTML file"
"$PI" -p "run echo exported" </dev/null >/dev/null
session="$(ls -t .sessions/*.jsonl | head -1)"
"$PI" --export "$session" .sessions/export.html </dev/null
ls -la .sessions/export.html
