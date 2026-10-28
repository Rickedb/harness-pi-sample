/**
 * Trace: log every lifecycle event, in the order Pi fires it.
 *
 * This extension changes nothing. It exists so you can load it next to any other example
 * and *watch* how Pi's pieces interact (input -> prompt hooks -> model request -> tool gate -> tool -> result ...).
 *
 *   - writes one line per event to ./.trace/events.log   (override with PI_TRACE_FILE)
 *   - /trace          toggles a live widget with the last events (interactive mode)
 *   - /trace clear    empties the log
 *
 * Concepts shown: pi.on() for many events, notification-only handlers, ctx.ui.setWidget, pi.registerCommand.
 *
 * What each traced event is for, in the order they fire for a prompt that uses one tool:
 *
 *   Event                    Fires when...                                  A handler can...                              See example
 *   -----------------------  ---------------------------------------------  --------------------------------------------  -----------
 *   session_start            a session starts or is replaced (/new,         set up per-session state (open files,         11, 12
 *                            /resume, /fork, reload); `reason` says which   rebuild state from the branch)
 *   input                    the user submits text, BEFORE templates,       transform the text, or swallow it ("handled"  10
 *                            skills or the model see it                     = no model call at all)
 *   before_agent_start       input is accepted, before the run begins       add system-prompt sections, change the        13
 *                                                                           active tools, inject a message
 *   agent_start              one low-level agent run begins                 observe only
 *   turn_start               a turn begins (a turn = ONE model request      observe only
 *                            plus execution of the tool calls it returned)
 *   context                  the message list is about to be sent (system   rewrite or prune history for THIS request     13
 *                            message excluded); fires every turn            only; the session itself is untouched
 *   before_provider_request  the serialized payload is about to be sent     inspect or replace the payload. Only fires    00
 *                            (needs a provider that calls `onPayload`)      if the provider calls the callback
 *   message_end              a message is finalized: system, user,          replace the finalized message (same role)
 *                            assistant (text and/or tool calls), toolResult
 *   tool_execution_start     Pi begins running a tool call                  observe only
 *   tool_call                just before the tool executes: THE GATE        block it, or edit `event.input` in place      09
 *   tool_result              after the tool ran                             redact/replace what the model sees.           09
 *                                                                           NOT fired when tool_call blocked the call
 *   tool_execution_end       the tool call is finished (also when blocked)  observe only
 *   turn_end                 the model response and its tools are done      add entries, or request one more turn
 *                            (another turn follows if tools returned)       (guard against loops!)
 *   agent_end                one low-level run ended. NOT "idle": retries,  observe only
 *                            compaction or queued prompts may start another
 *   agent_before_settle      last moment before Pi would go idle            append final entries, request one continuation
 *   agent_settled            Pi will NOT continue on its own: really done   notify, log, desktop alert, exit a script     19
 *   session_shutdown         the session ends (quit, reload, replacement)   release resources; keep cleanup idempotent
 *
 * Not traced here because they fire many times per message: message_update (each streamed chunk),
 * tool_execution_update (tool progress) and provider_stream_event (raw provider events).
 * Handlers run in extension load order; "observe only" events ignore return values.
 * Full reference: docs/extensions.md in the Pi package, section "Understand the runtime lifecycle".
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const short = (value: unknown, max = 70): string => {
	const text = typeof value === "string" ? value : JSON.stringify(value);
	const flat = (text ?? "").replace(/\s+/g, " ");
	return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

export default function (pi: ExtensionAPI) {
	const recent: string[] = [];
	let widgetOn = false;
	let ui: ExtensionContext["ui"] | undefined;
	let file = "";

	const log = (event: string, detail = "") => {
		const stamp = new Date().toISOString().slice(11, 23);
		const line = `${stamp}  ${event.padEnd(22)} ${detail}`.trimEnd();
		try {
			appendFileSync(file, `${line}\n`);
		} catch {
			// tracing must never break the agent
		}
		recent.push(line);
		if (recent.length > 14) recent.shift();
		if (widgetOn) ui?.setWidget("trace", [...recent], { placement: "belowEditor" });
	};

	pi.on("session_start", (event, ctx) => {
		file = resolve(ctx.cwd, process.env.PI_TRACE_FILE ?? ".trace/events.log");
		mkdirSync(dirname(file), { recursive: true });
		ui = ctx.hasUI ? ctx.ui : undefined;
		log("session_start", `reason=${event.reason}`);
	});
	pi.on("session_shutdown", () => log("session_shutdown"));

	pi.on("input", (event) => log("input", `source=${event.source} ${short(event.text)}`));
	pi.on("before_agent_start", () => log("before_agent_start"));
	pi.on("agent_start", () => log("agent_start"));
	pi.on("turn_start", () => log("turn_start"));
	pi.on("context", (event) => log("context", `${event.messages.length} messages`));
	pi.on("before_provider_request", () => log("before_provider_request"));
	pi.on("message_end", (event) => log("message_end", `role=${event.message.role}`));
	pi.on("tool_execution_start", (event) => log("tool_execution_start", `${event.toolName}`));
	pi.on("tool_call", (event) => log("tool_call", `${event.toolName} ${short(event.input)}`));
	pi.on("tool_result", (event) => log("tool_result", `${event.toolName} error=${event.isError}`));
	pi.on("tool_execution_end", (event) => log("tool_execution_end", `${event.toolName}`));
	pi.on("turn_end", () => log("turn_end"));
	pi.on("agent_end", () => log("agent_end"));
	pi.on("agent_before_settle", () => log("agent_before_settle"));
	pi.on("agent_settled", () => log("agent_settled"));

	pi.registerCommand("trace", {
		description: "Toggle the live event trace widget (or: /trace clear)",
		handler: async (args, ctx) => {
			if (args.trim() === "clear") {
				writeFileSync(file, "");
				recent.length = 0;
				ctx.ui.notify("Trace log cleared", "info");
				return;
			}
			widgetOn = !widgetOn;
			ctx.ui.setWidget("trace", widgetOn ? [...recent] : undefined, { placement: "belowEditor" });
			ctx.ui.notify(`Trace widget ${widgetOn ? "on" : "off"} - full log: ${file}`, "info");
		},
	});
}
