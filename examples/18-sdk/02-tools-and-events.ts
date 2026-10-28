/**
 * SDK 02 - give the session YOUR tools and watch (or veto) what it does.
 *
 *   node examples/18-sdk/02-tools-and-events.ts
 *
 * Two integration styles side by side:
 *   - `customTools`        : tools passed as plain objects (defineTool)
 *   - inline extension     : a function(pi) - same API as a file-based extension, but in your code
 *
 * Here an inline extension vetoes `bash`, and a session subscriber logs every event type.
 */
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createMockSession } from "./_mock-session.ts";

const shout = defineTool({
	name: "shout",
	label: "Shout",
	description: "Upper-case a string.",
	parameters: Type.Object({ text: Type.String() }),
	async execute(_id, params) {
		return { content: [{ type: "text", text: params.text.toUpperCase() }], details: undefined };
	},
});

const vetoBash = (pi: ExtensionAPI) => {
	pi.on("tool_call", (event) => (event.toolName === "bash" ? { block: true, reason: "bash is disabled in this app" } : undefined));
};

const session = await createMockSession({ customTools: [shout], extensions: [vetoBash] });
const seen: string[] = [];
const unsubscribe = session.subscribe((event) => {
	if (event.type === "tool_execution_start") seen.push(`start:${event.toolName}`);
	else if (event.type === "tool_execution_end") seen.push(`end:${event.toolName}${event.isError ? "(error)" : ""}`);
});

try {
	await session.prompt('call shout {"text":"hello sdk"}');
	console.log("answer :", session.getLastAssistantText());
	await session.prompt("run echo should-not-run");
	console.log("answer :", session.getLastAssistantText());
	console.log("events :", seen.join("  "));
} finally {
	unsubscribe();
	session.dispose();
}
