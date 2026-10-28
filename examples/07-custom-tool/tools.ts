/**
 * Custom tools: give the model new abilities.
 *
 * A tool = name + description (what the model reads) + TypeBox parameter schema + execute().
 *   - roll_dice  : pure function, structured `details`, custom TUI rendering.
 *   - file_stats : touches the filesystem, streams progress with onUpdate, and *throws* to report failure.
 *
 * Things worth noticing:
 *   - `promptSnippet` / `promptGuidelines` add lines to the system prompt while the tool is active.
 *   - `content` is what the MODEL sees; `details` is for rendering / state and is not sent to it.
 *   - throwing from execute() => the model receives an error result (isError: true) and can recover.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Text } from "@earendil-works/pi-tui";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const rollDice = defineTool({
	name: "roll_dice",
	label: "Roll dice",
	description: "Roll one or more dice and return each result and the total.",
	promptSnippet: "Roll dice with a given number of sides",
	promptGuidelines: ["Use roll_dice for any random number the user asks for instead of inventing one. [marker:tool-roll-dice]"],
	parameters: Type.Object({
		sides: Type.Integer({ minimum: 2, maximum: 1000, description: "Number of sides per die" }),
		count: Type.Optional(Type.Integer({ minimum: 1, maximum: 20, description: "How many dice (default 1)" })),
	}),

	async execute(_toolCallId, params) {
		const count = params.count ?? 1;
		const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * params.sides));
		const total = rolls.reduce((a, b) => a + b, 0);
		return {
			content: [{ type: "text", text: `Rolled ${count}d${params.sides}: [${rolls.join(", ")}] total=${total}` }],
			details: { rolls, total, sides: params.sides },
		};
	},

	renderCall(args, theme) {
		return new Text(theme.fg("toolTitle", theme.bold("roll_dice ")) + theme.fg("muted", `${args.count ?? 1}d${args.sides}`), 0, 0);
	},
	renderResult(result, _options, theme) {
		const details = result.details as { rolls: number[]; total: number } | undefined;
		if (!details) return new Text("", 0, 0);
		return new Text(`${theme.fg("success", "🎲")} ${details.rolls.join(" + ")} = ${theme.fg("accent", String(details.total))}`, 0, 0);
	},
});

const fileStats = defineTool({
	name: "file_stats",
	label: "File stats",
	description: "Count lines, words and bytes of a text file in the working directory.",
	promptSnippet: "Count lines/words/bytes of a file",
	parameters: Type.Object({
		path: Type.String({ description: "Path relative to the working directory" }),
	}),

	async execute(_toolCallId, params, signal, onUpdate, ctx) {
		onUpdate?.({ content: [{ type: "text", text: `reading ${params.path}…` }], details: undefined });
		// Throwing => failed tool result. The model sees the message and can try something else.
		const text = await readFile(resolve(ctx.cwd, params.path), { encoding: "utf8", signal });
		const stats = {
			lines: text.split("\n").length - (text.endsWith("\n") ? 1 : 0),
			words: text.split(/\s+/).filter(Boolean).length,
			bytes: Buffer.byteLength(text),
		};
		return {
			content: [{ type: "text", text: `${params.path}: ${stats.lines} lines, ${stats.words} words, ${stats.bytes} bytes` }],
			details: stats,
		};
	},
});

export default function (pi: ExtensionAPI) {
	pi.registerTool(rollDice);
	pi.registerTool(fileStats);
}
