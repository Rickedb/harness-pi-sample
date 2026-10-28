/**
 * Prompt hooks: shape what the MODEL sees, without touching what the USER sees.
 *
 *   before_agent_start  -> add a named system-prompt SECTION (cheap, cache-friendly, per run)
 *   context             -> edit the conversation messages for ONE request (the session is not modified)
 *
 * Here:
 *   1. a `project_facts` section with today's date and the current directory
 *   2. old, bulky tool results are trimmed in the request only (classic context hygiene);
 *      the full output stays in the session file and in the TUI.
 *
 * Try: `run seq 1 400` then a second prompt `inspect` - the mock reports a smaller "message chars".
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const MAX_OLD_RESULT_CHARS = 300;

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", (event, ctx) => {
		event.systemPromptOptions.sections.project_facts = [
			"<project_facts>",
			`[marker:prompt-hooks-facts]`,
			`today: ${new Date().toISOString().slice(0, 10)}`,
			`cwd: ${ctx.cwd}`,
			"</project_facts>",
		].join("\n");
	});

	pi.on("context", (event) => {
		const lastIndex = event.messages.length - 1;
		const messages = event.messages.map((message, index) => {
			if (index === lastIndex || message.role !== "toolResult") return message;
			const trimmed = message.content.map((part) =>
				part.type === "text" && part.text.length > MAX_OLD_RESULT_CHARS
					? { ...part, text: `${part.text.slice(0, 120)}\n[…trimmed ${part.text.length - 120} chars from an older tool result]` }
					: part,
			);
			return { ...message, content: trimmed };
		});
		return { messages };
	});
}
