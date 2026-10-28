#!/usr/bin/env node
/**
 * RPC 02 - the raw protocol, no client library. This is what a Python/Go/Rust host would implement.
 *
 *   node examples/19-rpc/rpc-raw.mjs
 *
 * Shows the three record families (see docs/rpc.md in the Pi package):
 *   stdin  -> commands            {"id":"1","type":"prompt","message":"..."}
 *   stdout <- responses           {"type":"response","command":"prompt","success":true,...}
 *   stdout <- events              {"type":"tool_execution_start",...}, {"type":"agent_settled"}
 *   stdout <- extension_ui_request  a guardrail asks "allow this command?"  -> we answer on stdin
 *
 * Framing: one JSON object per line, split ONLY on "\n" (never use readline here: it also splits on
 * U+2028/U+2029, which are legal inside JSON strings).
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const decision = process.argv[2] === "deny" ? false : true; // node rpc-raw.mjs [deny]

const child = spawn(
	process.execPath,
	[
		join(ROOT, "node_modules/@earendil-works/pi-coding-agent/dist/cli.js"),
		"--mode", "rpc", "--no-session", "--model", "mock/scripted",
		"-na", "-ne", "-ns", "-np", "-nc", "--no-themes",
		"-e", join(ROOT, "examples/00-mock-provider/mock-provider.ts"),
		"-e", join(ROOT, "examples/09-guardrails/guardrails.ts"),
	],
	{ cwd: ROOT, env: { ...process.env, PI_CODING_AGENT_DIR: join(ROOT, ".pi-agent-dir") }, stdio: ["pipe", "pipe", "inherit"] },
);

const send = (record) => child.stdin.write(`${JSON.stringify(record)}\n`);

function onRecord(record) {
	switch (record.type) {
		case "response":
			console.log(`<- response  ${record.command} success=${record.success}`);
			break;
		case "extension_ui_request":
			if (record.method === "confirm") {
				console.log(`<- ui request (confirm): ${record.title} -> answering ${decision ? "YES" : "NO"}`);
				send({ type: "extension_ui_response", id: record.id, confirmed: decision });
			}
			break;
		case "tool_execution_end":
			console.log(`<- event     tool_execution_end ${record.toolName} isError=${record.isError}`);
			break;
		case "message_end":
			if (record.message.role === "assistant") {
				const text = record.message.content.filter((c) => c.type === "text").map((c) => c.text).join("");
				if (text) console.log(`<- assistant ${JSON.stringify(text.slice(0, 80))}`);
			}
			break;
		case "agent_settled":
			// Not agent_end: retries / queued work can start another run after agent_end.
			console.log("<- event     agent_settled  (Pi will not continue on its own)");
			child.stdin.end(); // closing stdin = orderly shutdown
			break;
	}
}

// LF-only line splitting over a byte stream.
const decoder = new StringDecoder("utf8");
let buffer = "";
child.stdout.on("data", (chunk) => {
	buffer += decoder.write(chunk);
	let newline;
	while ((newline = buffer.indexOf("\n")) !== -1) {
		const line = buffer.slice(0, newline).replace(/\r$/, "");
		buffer = buffer.slice(newline + 1);
		if (line) onRecord(JSON.parse(line));
	}
});
child.on("exit", (code) => console.log(`pi exited with ${code}`));

console.log('-> command   prompt: "run rm -rf /tmp/pi-sample-not-real"  (the guardrail will ask us)');
send({ id: "1", type: "prompt", message: "run rm -rf /tmp/pi-sample-not-real" });
