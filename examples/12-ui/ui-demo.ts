/**
 * UI surface: status line, widget, title and dialogs. All via `ctx.ui`.
 *
 *   status  : a keyed string in the footer          (ctx.ui.setStatus)
 *   widget  : lines above/below the editor          (ctx.ui.setWidget)
 *   dialogs : select / input / confirm / notify     (work in TUI *and* RPC mode)
 *   custom  : full components with focus           (ctx.ui.custom - TUI only, see docs/tui.md)
 *
 * Modes matter: print/JSON mode has NO UI (ctx.hasUI === false); RPC forwards dialogs to the client;
 * only the TUI renders widgets. Keep tool/event logic independent of UI, and guard UI calls.
 *
 * Try:  /ui-wizard
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let turns = 0;
	let toolCalls = 0;

	pi.on("session_start", (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setTitle("pi sample");
		ctx.ui.setStatus("sample", "ready");
	});

	pi.on("tool_execution_end", (event, ctx) => {
		toolCalls++;
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("sample-last-tool", [`last tool: ${event.toolName}`], { placement: "aboveEditor" });
	});

	pi.on("turn_end", (_event, ctx) => {
		turns++;
		if (ctx.hasUI) ctx.ui.setStatus("sample", `${turns} turn(s) · ${toolCalls} tool call(s)`);
	});

	pi.registerCommand("ui-wizard", {
		description: "Walk through select -> input -> confirm dialogs",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) return;
			const flavor = await ctx.ui.select("Pick a flavor", ["vanilla", "chocolate", "mango"]);
			if (!flavor) return ctx.ui.notify("Cancelled", "warning");
			const scoops = await ctx.ui.input("How many scoops?", "2");
			const ok = await ctx.ui.confirm("Order", `${scoops || "1"} scoop(s) of ${flavor}?`);
			ctx.ui.notify(ok ? `Ordered ${scoops || 1} × ${flavor}` : "Order cancelled", ok ? "info" : "warning");
		},
	});
}
