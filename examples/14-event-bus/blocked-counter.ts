/**
 * Event bus, listener #2: a footer badge counting blocked tool calls.
 *
 * Same events as audit-log.ts, completely different reaction - and neither extension knows the other exists.
 * Load order = registration order, but bus listeners don't depend on it.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	let blocked = 0;
	let ctxRef: ExtensionContext | undefined;

	pi.on("session_start", (_event, ctx) => {
		ctxRef = ctx;
	});

	pi.events.on("guardrails:blocked", () => {
		blocked++;
		if (ctxRef?.hasUI) ctxRef.ui.setStatus("guard", `🛡 ${blocked} blocked`);
	});
}
