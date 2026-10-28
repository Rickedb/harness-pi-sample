#!/usr/bin/env python3
"""RPC 03 - the same protocol from Python (standard library only).

    python3 examples/19-rpc/rpc_minimal.py

Reading stdout as BYTES and splitting on b"\\n" is the correct framing (text-mode line readers can
split on Unicode separators that are legal inside JSON strings).
"""
import json
import os
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
env = {**os.environ, "PI_CODING_AGENT_DIR": str(root / ".pi-agent-dir")}
process = subprocess.Popen(
    [
        "node", str(root / "node_modules/@earendil-works/pi-coding-agent/dist/cli.js"),
        "--mode", "rpc", "--no-session", "--model", "mock/scripted",
        "-na", "-ne", "-ns", "-np", "-nc", "--no-themes",
        "-e", str(root / "examples/00-mock-provider/mock-provider.ts"),
    ],
    cwd=root, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
)

def send(command):
    process.stdin.write(json.dumps(command).encode() + b"\n")
    process.stdin.flush()

send({"id": "1", "type": "prompt", "message": "run echo hello from python"})

while line := process.stdout.readline():
    record = json.loads(line)
    if record.get("type") == "message_update":
        update = record["assistantMessageEvent"]
        if update["type"] == "text_delta":
            print(update["delta"], end="", flush=True)
    elif record.get("type") == "agent_settled":
        print()
        break

process.stdin.close()
process.wait()
