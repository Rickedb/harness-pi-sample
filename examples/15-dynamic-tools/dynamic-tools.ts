/**
 * Dynamic tools: change WHICH tools the model can see, while a session is running.
 *
 * Three techniques:
 *   1. Register a tool but keep it inactive   -> pi.registerTool() + pi.setActiveTools()
 *   2. A "loader" tool the MODEL calls to unlock more tools   -> unlock_admin_tools
 *   3. A command the USER calls to switch profiles            -> /mode safe|full
 *
 * Why bother? Fewer tools = shorter prompt, fewer wrong calls, and a smaller blast radius.
 * Pi records tool changes in the transcript, so the model is told when tools appear/disappear.
 *
 * Try (mock):  inspect  ->  call unlock_admin_tools {}  ->  inspect  ->  /mode safe  ->  inspect
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const ADMIN_TOOLS = ["admin_reset_cache", "admin_rotate_logs"];
const SAFE_TOOLS = ["read", "grep", "find", "ls"];

export default function (pi: ExtensionAPI) {
	const adminTool = (name: string, text: string) =>
		pi.registerTool({
			name,
			label: name,
			description: `Admin operation: ${text}`,
			parameters: Type.Object({}),
			async execute() {
				return { content: [{ type: "text", text: `${name}: ${text} (simulated)` }], details: undefined };
			},
		});
	adminTool("admin_reset_cache", "reset the application cache");
	adminTool("admin_rotate_logs", "rotate the log files");

	const hideAdmin = () => pi.setActiveTools(pi.getActiveTools().filter((name) => !ADMIN_TOOLS.includes(name)));
	pi.on("session_start", () => hideAdmin());

	pi.registerTool({
		name: "unlock_admin_tools",
		label: "Unlock admin tools",
		description: "Make the admin_* tools available for the rest of the session. Call only when the user asks for admin work.",
		parameters: Type.Object({}),
		async execute() {
			pi.setActiveTools([...new Set([...pi.getActiveTools(), ...ADMIN_TOOLS])]);
			return { content: [{ type: "text", text: `Unlocked: ${ADMIN_TOOLS.join(", ")}` }], details: undefined };
		},
	});

	pi.registerCommand("mode", {
		description: "Switch tool profile: /mode safe (read-only) | /mode full (defaults)",
		getArgumentCompletions: (prefix) => ["safe", "full"].filter((m) => m.startsWith(prefix)).map((m) => ({ value: m, label: m })),
		handler: async (args, ctx) => {
			const mode = args.trim();
			if (mode === "safe") pi.setActiveTools(SAFE_TOOLS);
			else if (mode === "full") pi.setActiveTools(["read", "bash", "edit", "write", "unlock_admin_tools"]);
			else return ctx.ui.notify("Usage: /mode safe|full", "warning");
			ctx.ui.notify(`Active tools: ${pi.getActiveTools().join(", ")}`, "info");
		},
	});
}
