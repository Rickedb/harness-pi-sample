/**
 * Slash commands, CLI flags and keyboard shortcuts - the three ways a USER (not the model) drives an extension.
 *
 *   /hello [name]      a command with argument completion
 *   /ask-inspect       a command that talks to the agent via pi.sendUserMessage()
 *   /session-info      a command that reads session/runtime state from ctx
 *   --shout            a CLI flag (pi --shout) read with pi.getFlag()
 *   Ctrl+Shift+H       a shortcut (interactive mode only)
 *
 * Commands never reach the model on their own: they run in-process. They can *choose* to
 * inject a user message (sendUserMessage) or a custom message (sendMessage).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.registerFlag("shout", {
		description: "Make /hello shout",
		type: "boolean",
		default: false,
	});

	pi.registerCommand("hello", {
		description: "Say hello (try: /hello world)",
		getArgumentCompletions: (prefix) => {
			const names = ["world", "Pi", "team"].filter((n) => n.startsWith(prefix));
			return names.length ? names.map((n) => ({ value: n, label: n })) : null;
		},
		handler: async (args, ctx) => {
			const text = `Hello, ${args.trim() || "world"}!`;
			ctx.ui.notify(pi.getFlag("shout") ? text.toUpperCase() : text, "info");
		},
	});

	pi.registerCommand("ask-inspect", {
		description: "Send the prompt 'inspect' to the agent as if you typed it",
		handler: async (_args, ctx) => {
			if (!ctx.isIdle()) await ctx.waitForIdle();
			pi.sendUserMessage("inspect");
		},
	});

	pi.registerCommand("session-info", {
		description: "Show model, tools and context usage",
		handler: async (_args, ctx) => {
			const usage = ctx.getContextUsage();
			const lines = [
				`cwd:    ${ctx.cwd}`,
				`mode:   ${ctx.mode}`,
				`model:  ${ctx.model?.provider}/${ctx.model?.id}`,
				`tools:  ${pi.getActiveTools().join(", ")}`,
				`usage:  ${usage ? `${usage.tokens ?? "?"} / ${usage.contextWindow} tokens` : "n/a"}`,
			];
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});

	pi.registerShortcut("ctrl+shift+h", {
		description: "Greet from a shortcut",
		handler: async (ctx) => ctx.ui.notify("Hello from Ctrl+Shift+H", "info"),
	});
}
