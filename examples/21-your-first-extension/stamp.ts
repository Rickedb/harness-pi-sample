/**
 * Your first extension: the smallest useful one that touches the model's view of the world.
 *
 * It prefixes every `bash` result with a timestamp and exposes a `/stamped` counter.
 * Total: one hook + one command. Everything else in this repo is a variation on these two moves.
 *
 *   scripts/pi-iso -e examples/21-your-first-extension/stamp.ts -p 'run echo hello'
 *
 * Returning `undefined` from a hook means "I have no opinion"; returning an object overrides fields.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let stamped = 0;

	pi.on("tool_result", async (event) => {
		if (event.toolName !== "bash") return undefined; // undefined = "no change"
		stamped++;
		const stamp = `[${new Date().toISOString().slice(11, 19)}] `;
		return {
			content: event.content.map((part) => (part.type === "text" ? { ...part, text: stamp + part.text } : part)),
		};
	});

	pi.registerCommand("stamped", {
		description: "How many bash results have been stamped?",
		handler: async (_args, ctx) => ctx.ui.notify(`${stamped} bash result(s) stamped`, "info"),
	});
}
