/**
 * RPC 01 - drive Pi as a child process with the typed RpcClient.
 *
 *   node examples/19-rpc/rpc-client.ts
 *
 * RPC mode = `pi --mode rpc`: JSONL commands on stdin, JSONL responses + events on stdout.
 * Use it when your host is not Node (or you want process isolation). The client below spawns Pi,
 * sends prompts, streams events, and queries state - one long-lived session, many prompts.
 *
 * This also proves the claim from example 15: tools unlocked by one prompt stay unlocked for the next.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RpcClient } from "@earendil-works/pi-coding-agent";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const client = new RpcClient({
	cliPath: join(ROOT, "node_modules/@earendil-works/pi-coding-agent/dist/cli.js"),
	cwd: ROOT,
	env: { ...(process.env as Record<string, string>), PI_CODING_AGENT_DIR: join(ROOT, ".pi-agent-dir") },
	provider: "mock",
	model: "scripted",
	// Same isolation flags as scripts/pi-iso, then opt in to the extensions we want.
	args: [
		"-na", "-ne", "-ns", "-np", "-nc", "--no-themes", "--no-session",
		"-e", join(ROOT, "examples/00-mock-provider/mock-provider.ts"),
		"-e", join(ROOT, "examples/15-dynamic-tools/dynamic-tools.ts"),
		"-e", join(ROOT, "examples/08-commands-flags-shortcuts/commands.ts"),
	],
});

const toolNames = (text: string) => text.match(/tools declared \(\d+\): (.*)/)?.[1] ?? "?";

try {
	await client.start();

	const unsubscribe = client.onEvent((event) => {
		if (event.type === "tool_execution_start") console.log(`  [event] tool_execution_start ${event.toolName}`);
	});

	await client.promptAndWait("inspect");
	console.log("before unlock:", toolNames((await client.getLastAssistantText()) ?? ""));

	await client.promptAndWait("call unlock_admin_tools {}");
	await client.promptAndWait("inspect");
	console.log("after unlock :", toolNames((await client.getLastAssistantText()) ?? ""));

	const state = await client.getState();
	console.log("model        :", `${state.model?.provider}/${state.model?.id}`);
	console.log("commands     :", (await client.getCommands()).map((c) => `/${c.name}`).join(" "));
	unsubscribe();
} finally {
	await client.stop();
}
