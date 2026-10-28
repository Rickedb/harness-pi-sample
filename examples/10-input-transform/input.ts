/**
 * Input transform: the `input` event fires on raw user text BEFORE templates, skills and the model.
 *
 * These are ALL the actions the handler can return (InputEventResult):
 *
 *   action: "continue"                  leave it alone
 *   action: "transform", text           rewrite the text, then carry on
 *   action: "transform", text, images   ...and also replace the attached images
 *                                       (omit `images` = keep them, [] = drop them all)
 *   action: "handled"                   swallow it - no model call at all (free, instant answers)
 *
 * Try:
 *   ?quick what is a monad       -> transform: rewritten into a "be brief" prompt
 *   ?text describe this          -> transform + images: attached images are dropped
 *   ping                         -> handled: answered locally, no LLM call
 *   time                         -> handled: answered locally, no LLM call
 *   anything else                -> continue
 *
 * The event also carries context for your decision:
 *   event.source             who produced the text: "interactive", "rpc" or "extension"
 *   event.images             images attached to the message, if any
 *   event.streamingBehavior  "steer" | "followUp" if the agent is mid-run, undefined when idle
 * Skip "extension" input so two transformers can't loop on each other.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension") return { action: "continue" };

		if (event.text.startsWith("?quick ")) {
			return { action: "transform", text: `Answer in one or two sentences: ${event.text.slice(7).trim()}` };
		}

		if (event.text.startsWith("?text ")) {
			return { action: "transform", text: event.text.slice(6).trim(), images: [] };
		}

		const word = event.text.trim().toLowerCase();
		if (word === "ping" || word === "time") {
			ctx.ui.notify(word === "ping" ? "pong" : new Date().toLocaleString(), "info");
			return { action: "handled" };
		}
		return { action: "continue" };
	});
}
