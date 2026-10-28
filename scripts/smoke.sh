#!/usr/bin/env bash
# Smoke tests: every example, offline, against the mock model. Exit code != 0 if any check fails.
#   npm run smoke        (also part of `npm run check`)
# Useful after upgrading the pinned Pi version: it tells you which capability changed behaviour.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ISO=scripts/pi-iso
pass=0; fail=0
rm -rf .sessions .trace

# check "<name>" "<regex that output must match>" <command...>
check() {
  local name="$1" pattern="$2"; shift 2
  local out; out="$("$@" </dev/null 2>&1)"
  if grep -qE -- "$pattern" <<<"$out"; then printf '  ok    %s\n' "$name"; pass=$((pass+1))
  else printf '  FAIL  %s\n        wanted /%s/\n        got: %s\n' "$name" "$pattern" "$(head -c 400 <<<"$out")"; fail=$((fail+1)); fi
}
# refute "<name>" "<regex that output must NOT match>" <command...>
refute() {
  local name="$1" pattern="$2"; shift 2
  local out; out="$("$@" </dev/null 2>&1)"
  if grep -qE -- "$pattern" <<<"$out"; then printf '  FAIL  %s (unexpected /%s/)\n' "$name" "$pattern"; fail=$((fail+1))
  else printf '  ok    %s\n' "$name"; pass=$((pass+1)); fi
}

echo "declarative resources"
check  "00 mock provider answers"           'You said: "hello"'                        $ISO -p hello
check  "02 context file (level 1)"          'ctx-example-02$'                          bash -c "cd examples/02-context-files && PI_ISO_CONTEXT=1 ../../$ISO -p inspect"
check  "02 nested context stacks"           'ctx-example-02, ctx-example-02-nested'    bash -c "cd examples/02-context-files/nested && PI_ISO_CONTEXT=1 ../../../$ISO -p inspect"
check  "03 append system prompt"            'append-system-example'                    $ISO --append-system-prompt examples/03-system-prompt/append.md -p inspect
check  "03 replace system prompt"           'system prompt: 1[0-9]{2} chars'           $ISO --system-prompt examples/03-system-prompt/replace.md -p inspect
check  "04 template args + defaults"        'Depth: deep'                              $ISO --prompt-template examples/04-prompt-templates -p '/explain a.ts deep'
check  "04 template default value"          'Focus on correctness'                     $ISO --prompt-template examples/04-prompt-templates -p '/review'
check  "05 skill advertised to model"       'skill-changelog-writer'                   $ISO --skill examples/05-skills -p inspect
refute "05 manual-only skill hidden"        'release-checklist'                        $ISO --skill examples/05-skills -p inspect
check  "05 /skill:name injects body"        'skill name=..release-checklist'                    $ISO --skill examples/05-skills -p '/skill:release-checklist go'

echo "extensions"
check  "01 trace logs lifecycle"            'tool_call +roll_dice'                     bash -c "$ISO -e examples/01-trace/trace.ts -e examples/07-custom-tool/tools.ts -p 'call roll_dice {\"sides\":6}' >/dev/null; cat .trace/events.log"
check  "07 tool executes"                   'Rolled 2d6'                               $ISO -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":6,"count":2}'
check  "07 schema validation error"         'sides: must be >= 2'                      $ISO -e examples/07-custom-tool/tools.ts -p 'call roll_dice {"sides":1}'
check  "07 thrown error -> error result"    'file_stats. failed'                       $ISO -e examples/07-custom-tool/tools.ts -p 'call file_stats {"path":"nope.txt"}'
check  "07 promptGuidelines in prompt"      'tool-roll-dice'                           $ISO -e examples/07-custom-tool/tools.ts -p inspect
check  "08 flag registered"                 '--shout'                                  $ISO -e examples/08-commands-flags-shortcuts/commands.ts --help
GR="-e examples/09-guardrails/guardrails.ts"
check  "09 dangerous bash blocked (no UI)"  'no UI available'                          $ISO $GR -p 'run rm -rf /tmp/never'
check  "09 protected path blocked"          'is protected'                             $ISO $GR -p 'write .env x=1'
check  "09 normal bash passes"              'returned:.*|^fine'                        $ISO $GR -p 'run echo fine'
check  "09 secret redacted"                 'REDACTED:aws-key'                         $ISO $GR -p 'run echo AKIAABCDEFGHIJKLMNOP'
refute "09 secret never reaches model"      'AKIAABCDEFGHIJKLMNOP'                     $ISO $GR -p 'run echo AKIAABCDEFGHIJKLMNOP'
check  "10 ?quick rewritten"                'Answer in one or two sentences'           $ISO -e examples/10-input-transform/input.ts -p '?quick why'
refute "10 ping never reaches model"        'You said'                                 $ISO -e examples/10-input-transform/input.ts -p 'ping'
rm -rf .sessions
$ISO -e examples/11-stateful-tool/notes.ts -p 'call note {"action":"add","text":"one"}' </dev/null >/dev/null 2>&1
check  "11 state survives --continue"       '1\. one'                                  $ISO -c -e examples/11-stateful-tool/notes.ts -p 'call note {"action":"add","text":"two"}'
rm -rf .sessions
check  "13 system prompt section added"     'prompt-hooks-facts'                       $ISO -e examples/13-prompt-hooks/prompt-hooks.ts -p inspect
rm -rf .trace
BUS="$GR -e examples/14-event-bus/audit-log.ts -e examples/14-event-bus/blocked-counter.ts"
$ISO $BUS -p 'write .env x' </dev/null >/dev/null 2>&1
check  "14 bus -> audit log"                '"kind":"blocked"'                         cat .trace/audit.jsonl
refute "15 admin tools hidden at start"     'admin_reset_cache'                        $ISO -e examples/15-dynamic-tools/dynamic-tools.ts -p inspect
check  "15 loader tool works"               'Unlocked: admin_reset_cache'              $ISO -e examples/15-dynamic-tools/dynamic-tools.ts -p 'call unlock_admin_tools {}'

check  "21 first extension stamps bash"      '\[[0-9:]{8}\] hello'                  $ISO -e examples/21-your-first-extension/stamp.ts -p 'run echo hello'

echo "integrations"
check  "16 MCP tool call"                    'tnega ip'                                 bash -c "cd examples/16-mcp/project && ../../../$ISO -a -e builtin:mcp -p 'call mcp__sample__reverse_text {\"text\":\"pi agent\"}'"
check  "17 package tool"                     'Greetings from pi-sample-bundle'         $ISO -e examples/17-packages/pi-sample-bundle -p 'call bundle_greet {"name":"x"}'
check  "17 package skill"                    'package-skill'                            $ISO -e examples/17-packages/pi-sample-bundle -p inspect
check  "18 sdk 01 minimal"                   'model: mock/scripted'                    node examples/18-sdk/01-minimal.ts
check  "18 sdk 02 custom tool + veto"        'events : start:shout +end:shout +start:bash +end:bash\(error\)' node examples/18-sdk/02-tools-and-events.ts
check  "18 sdk 03 sessions reopen"           'messages after 2nd prompt: 5'             node examples/18-sdk/03-sessions.ts
check  "18 sdk 04 resources (+project pkg)"  "skills : .*changelog-writer.*bundle-skill" node examples/18-sdk/04-resources.ts
check  "19 rpc client (unlock persists)"     'after unlock : .*admin_reset_cache'       node examples/19-rpc/rpc-client.ts
check  "19 rpc raw: allow"                   'isError=false'                            node examples/19-rpc/rpc-raw.mjs
check  "19 rpc raw: deny"                    'Blocked by the user'                      node examples/19-rpc/rpc-raw.mjs deny
check  "19 rpc python"                       'hello from python'                        python3 examples/19-rpc/rpc_minimal.py
check  "20 print/json/export script"         'export.html'                              bash examples/20-print-json-modes/run-all.sh

echo "real-model wiring (dry-run: nothing is sent anywhere)"
check  "claude alias -> anthropic model"     'pi .*--model anthropic/claude-sonnet-5-5'  env ANTHROPIC_API_KEY=dummy PI_DRY_RUN=1 scripts/pi-claude -p hi
check  "CLAUDE_MODEL overrides"              '--model anthropic/claude-opus-5-5'        env ANTHROPIC_API_KEY=dummy CLAUDE_MODEL=claude-opus-5-5 PI_DRY_RUN=1 PI_MODEL=claude $ISO -p hi
check  "missing key fails early with help"   'No credentials for provider "anthropic"'  env -u ANTHROPIC_API_KEY PI_ENV_FILE=/dev/null PI_CODING_AGENT_DIR="$ROOT/.sessions/empty-agent" scripts/pi-claude -p hi

echo "whole stack"
check  "99 stack: everything loaded"         'root-agents-md.*project-append-system|project-append-system.*root-agents-md' scripts/pi-stack -p inspect

rm -rf .sessions .trace
echo; echo "passed: $pass   failed: $fail"
[[ $fail -eq 0 ]]
