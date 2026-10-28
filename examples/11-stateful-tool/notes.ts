/**
 * Stateful tool: keep state that FOLLOWS THE CONVERSATION BRANCH.
 *
 * Where can an extension keep state? (see docs/extensions.md "State")
 *   1. tool-result `details`   <- used here. Lives in the session tree, so /tree, /fork and /resume
 *                                 automatically show the notes as they were at that point in history.
 *   2. pi.appendEntry()        <- durable, but NOT sent to the model (used here for an audit trail).
 *   3. pi.sendMessage()        <- stored AND sent to the model.
 *   4. external files/DB       <- outside the session; does not branch.
 *
 * The in-memory `notes` array is only a cache: it is rebuilt from the active branch on session_start
 * and session_tree, so it is always consistent with the branch you are looking at.
 *
 * Try (mock):  call note {"action":"add","text":"buy milk"}   then   /notes   then  /tree, go back, /notes
 */

import { StringEnum } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

interface NoteDetails {
	notes: string[];
}

export default function (pi: ExtensionAPI) {
	let notes: string[] = [];

	const rebuild = (ctx: ExtensionContext) => {
		notes = [];
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message" || entry.message.role !== "toolResult" || entry.message.toolName !== "note") continue;
			notes = [...((entry.message.details as NoteDetails | undefined)?.notes ?? [])];
		}
	};
	pi.on("session_start", (_event, ctx) => rebuild(ctx));
	pi.on("session_tree", (_event, ctx) => rebuild(ctx));

	pi.registerTool({
		name: "note",
		label: "Note",
		description: "Keep a short list of notes for the user. Actions: add (text), list, remove (index, 1-based).",
		promptSnippet: "Add, list or remove the user's notes",
		parameters: Type.Object({
			action: StringEnum(["add", "list", "remove"] as const),
			text: Type.Optional(Type.String({ description: "Note text (for add)" })),
			index: Type.Optional(Type.Integer({ minimum: 1, description: "1-based index (for remove)" })),
		}),
		async execute(_id, params) {
			if (params.action === "add") {
				if (!params.text) throw new Error("text is required for add");
				notes.push(params.text);
				pi.appendEntry("notes:audit", { added: params.text, at: Date.now() });
			} else if (params.action === "remove") {
				if (!params.index || params.index > notes.length) throw new Error(`no note #${params.index}`);
				notes.splice(params.index - 1, 1);
			}
			const listing = notes.length ? notes.map((n, i) => `${i + 1}. ${n}`).join("\n") : "(no notes)";
			return { content: [{ type: "text", text: listing }], details: { notes: [...notes] } satisfies NoteDetails };
		},
	});

	pi.registerCommand("notes", {
		description: "Show the notes on the current branch",
		handler: async (_args, ctx) => {
			ctx.ui.notify(notes.length ? notes.map((n, i) => `${i + 1}. ${n}`).join("\n") : "(no notes on this branch)", "info");
		},
	});
}
