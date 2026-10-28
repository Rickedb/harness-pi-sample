#!/usr/bin/env node
/**
 * A tiny MCP (Model Context Protocol) server over stdio, with ZERO dependencies.
 *
 * Wire format: newline-delimited JSON-RPC 2.0 on stdin/stdout. stdout is protocol-only; log to stderr.
 * It implements the minimum a client needs: initialize, tools/list, tools/call (+ ping).
 * In real life you would use @modelcontextprotocol/sdk - this exists so you can read the whole thing.
 *
 * Tools:  reverse_text {text}   ·   utc_now {}   ·   add {a, b}
 */
import { createInterface } from "node:readline";

const tools = [
	{
		name: "reverse_text",
		description: "Reverse a string.",
		inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
		annotations: { readOnlyHint: true },
	},
	{
		name: "utc_now",
		description: "Current UTC time as an ISO-8601 string.",
		inputSchema: { type: "object", properties: {} },
		annotations: { readOnlyHint: true },
	},
	{
		name: "add",
		description: "Add two numbers.",
		inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] },
		annotations: { readOnlyHint: true },
	},
];

const handlers = {
	reverse_text: ({ text }) => [...String(text)].reverse().join(""),
	utc_now: () => new Date().toISOString(),
	add: ({ a, b }) => String(Number(a) + Number(b)),
};

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

createInterface({ input: process.stdin }).on("line", (line) => {
	if (!line.trim()) return;
	let request;
	try {
		request = JSON.parse(line);
	} catch {
		return fail(null, -32700, "Parse error");
	}
	const { id, method, params } = request;
	if (id === undefined) return; // notifications (e.g. notifications/initialized) need no reply

	switch (method) {
		case "initialize":
			return reply(id, {
				protocolVersion: params?.protocolVersion ?? "2025-06-18",
				capabilities: { tools: {} },
				serverInfo: { name: "sample-mcp", version: "1.0.0" },
				instructions: "Small utility tools: reverse_text, utc_now, add.",
			});
		case "ping":
			return reply(id, {});
		case "tools/list":
			return reply(id, { tools });
		case "tools/call": {
			const handler = handlers[params?.name];
			if (!handler) return fail(id, -32602, `Unknown tool: ${params?.name}`);
			try {
				return reply(id, { content: [{ type: "text", text: handler(params.arguments ?? {}) }] });
			} catch (error) {
				return reply(id, { isError: true, content: [{ type: "text", text: String(error) }] });
			}
		}
		default:
			return fail(id, -32601, `Method not found: ${method}`);
	}
});
