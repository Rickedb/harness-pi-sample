/**
 * Event bus, listener #1: write an audit trail.
 *
 * `pi.events` is a tiny pub/sub shared by ALL loaded extensions. It lets extensions cooperate
 * without importing each other: the producer (09-guardrails) just emits; consumers subscribe.
 *
 * Contract used in this sample:
 *   "guardrails:blocked"  { tool, reason, detail }
 *   "guardrails:redacted" { tool }
 *
 * The bus has no replay: a listener must be registered before the event fires, so subscribe in the
 * factory (not lazily). Handlers are synchronous notifications - keep them fast.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const write = (kind: string, data: unknown) => {
		const dir = resolve(process.cwd(), ".trace");
		mkdirSync(dir, { recursive: true });
		appendFileSync(resolve(dir, "audit.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), kind, data })}\n`);
	};
	pi.events.on("guardrails:blocked", (data) => write("blocked", data));
	pi.events.on("guardrails:redacted", (data) => write("redacted", data));
}
