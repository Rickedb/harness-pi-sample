/**
 * Guardrails: intercept the model's tool use. Three different hooks, three different jobs.
 *
 *   tool_call    (GATE)       runs BEFORE a tool executes; can block it or edit its input.
 *   tool_result  (TRANSFORM)  runs AFTER; can redact / replace what the model gets to see.
 *   pi.events    (BUS)        announces what happened so OTHER extensions can react (example 14).
 *
 * Fail closed: when the safety decision cannot be made (no UI to ask), block.
 * Try (mock model):
 *   run rm -rf /tmp/some-dir                     -> asks you (TUI) / blocked (print mode)
 *   write .env SECRET=1                          -> blocked: protected path
 *   run echo "key=AKIAABCDEFGHIJKLMNOP"           -> output is redacted before the model sees it
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const DANGEROUS_BASH = [/\brm\s+-[a-z]*r[a-z]*f?\b/i, /\bsudo\b/i, /\bchmod\s+-R\b/i, /\bmkfs\b/i, /\bdd\s+if=/i];
const PROTECTED_PATHS = [/(^|\/)\.env(\.|$)/, /(^|\/)\.git\//, /(^|\/)node_modules\//];
const SECRET_PATTERNS: Array<[RegExp, string]> = [
	[/AKIA[0-9A-Z]{16}/g, "[REDACTED:aws-key]"],
	[/\bsk-[A-Za-z0-9]{20,}\b/g, "[REDACTED:api-key]"],
];

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		// 1) bash: ask before dangerous commands
		if (event.toolName === "bash") {
			const command = String(event.input.command ?? "");
			if (DANGEROUS_BASH.some((pattern) => pattern.test(command))) {
				if (!ctx.hasUI) {
					pi.events.emit("guardrails:blocked", { tool: "bash", reason: "dangerous, no UI to confirm", detail: command });
					return { block: true, reason: "Dangerous command blocked (no UI available to confirm)" };
				}
				const allowed = await ctx.ui.confirm("Dangerous command", `Allow this command?\n\n  ${command}`);
				if (!allowed) {
					pi.events.emit("guardrails:blocked", { tool: "bash", reason: "denied by user", detail: command });
					return { block: true, reason: "Blocked by the user" };
				}
			}
		}

		// 2) write/edit: never touch protected paths
		if (event.toolName === "write" || event.toolName === "edit") {
			const path = String(event.input.path ?? "");
			if (PROTECTED_PATHS.some((pattern) => pattern.test(path))) {
				pi.events.emit("guardrails:blocked", { tool: event.toolName, reason: "protected path", detail: path });
				if (ctx.hasUI) ctx.ui.notify(`Blocked ${event.toolName} to protected path: ${path}`, "warning");
				return { block: true, reason: `Path "${path}" is protected` };
			}
		}
		return undefined;
	});

	pi.on("tool_result", async (event) => {
		const redact = (text: string) => SECRET_PATTERNS.reduce((acc, [pattern, label]) => acc.replace(pattern, label), text);
		let changed = false;
		const content = event.content.map((part) => {
			if (part.type !== "text") return part;
			const clean = redact(part.text);
			if (clean !== part.text) changed = true;
			return { ...part, text: clean };
		});
		if (!changed) return undefined;
		pi.events.emit("guardrails:redacted", { tool: event.toolName });
		return { content };
	});
}
