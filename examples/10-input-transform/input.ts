/**
 * Input transform: the `input` event fires on raw user text BEFORE templates, skills and the model.
 *
 *   action: "continue"   leave it alone
 *   action: "transform"  rewrite the text, then carry on
 *   action: "handled"    swallow it - no model call at all (free, instant answers)
 *
 * Try:
 *   ?quick what is a monad       -> rewritten into a "be brief" prompt
 *   ping                         -> answered locally, no LLM call
 *   time                         -> answered locally, no LLM call
 *
 * `event.source` tells you who produced the text ("interactive", "rpc", "extension").
 * Skip "extension" input so two transformers can't loop on each other.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };

		if (event.text.startsWith("?quick ")) {
			return { action: "transform", text: `Answer in one or two sentences: ${event.text.slice(7).trim()}` };
		}

		const word = event.text.trim().toLowerCase();
		if (word === "ping" || word === "time") {
			ctx.ui.notify(word === "ping" ? "pong" : new Date().toLocaleString(), "info");
			return { action: "handled" };
		}
		return { action: "continue" };
	});
}
