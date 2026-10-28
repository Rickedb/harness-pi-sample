/** Part of pi-sample-bundle: one extension that adds a tool and a command. */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "bundle_greet",
		label: "Bundle greet",
		description: "Greet someone.",
		parameters: Type.Object({ name: Type.String() }),
		async execute(_id, params) {
			return { content: [{ type: "text", text: `Greetings from pi-sample-bundle, ${params.name}!` }], details: undefined };
		},
	});
	pi.registerCommand("bundle", {
		description: "Say which package this command comes from",
		handler: async (_args, ctx) => ctx.ui.notify("This command ships inside pi-sample-bundle", "info"),
	});
}
