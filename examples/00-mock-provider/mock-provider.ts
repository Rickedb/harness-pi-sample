/**
 * Mock provider: a scripted "LLM" so every example runs offline, deterministically, for free.
 *
 * It is also the smallest useful demo of a *custom provider* extension:
 *   pi.registerProvider(name, { api, models, streamSimple })
 *
 * What the "model" does (first matching rule wins):
 *   - last message is a tool result  -> summarizes it in plain text (ends the run)
 *   - "run <cmd>"                    -> calls the `bash` tool
 *   - "read <path>"                  -> calls the `read` tool
 *   - "write <path> <text>"          -> calls the `write` tool
 *   - "call <tool> {json}"           -> calls ANY tool by name (works for your own and MCP tools)
 *   - "inspect"                      -> reports what the model request actually contained
 *   - anything else                  -> echoes the prompt and lists these commands
 *
 * "inspect" is the important one for learning: a real model hides what Pi sent it,
 * the mock prints it (tool names, `[marker:*]` tags found in the system prompt, message counts).
 */

import {
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	createAssistantMessageEventStream,
	getCurrentSystemPrompt,
	getCurrentTools,
	type Message,
	type Model,
	type SimpleStreamOptions,
	type ToolCall,
	type TranscriptContext,
} from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER = "mock";
const MODEL_ID = "scripted";

type Plan = { text: string } | { text?: string; calls: Array<{ name: string; args: Record<string, unknown> }> };

function textOf(message: Message): string {
	if (message.role === "assistant" || message.role === "system") return "";
	const content = message.content;
	if (typeof content === "string") return content;
	return content.map((part) => (part.type === "text" ? part.text : "[image]")).join("\n");
}

function inspect(context: TranscriptContext): string {
	const system = getCurrentSystemPrompt(context.messages);
	const tools = getCurrentTools(context.messages).map((tool) => tool.name);
	const markers = [...new Set([...system.matchAll(/\[marker:([\w-]+)\]/g)].map((m) => m[1]))];
	const roles: Record<string, number> = {};
	for (const message of context.messages) roles[message.role] = (roles[message.role] ?? 0) + 1;
	return [
		"(mock) This is what Pi put in the model request:",
		`- system prompt: ${system.length} chars`,
		`- markers found in system prompt: ${markers.length ? markers.join(", ") : "(none)"}`,
		`- tools declared (${tools.length}): ${tools.join(", ")}`,
		`- messages by role: ${JSON.stringify(roles)}`,
		`- message chars (excl. system): ${context.messages.filter((m) => m.role !== "system").reduce((n, m) => n + JSON.stringify(m).length, 0)}`,
	].join("\n");
}

function plan(context: TranscriptContext): Plan {
	const conversation = context.messages.filter((m) => m.role !== "system");
	const last = conversation[conversation.length - 1];
	if (!last) return { text: "(mock) Empty conversation." };

	if (last.role === "toolResult") {
		const body = textOf(last).trim().slice(0, 400);
		return { text: last.isError ? `(mock) \`${last.toolName}\` failed:\n${body}` : `(mock) \`${last.toolName}\` returned:\n${body}` };
	}

	const prompt = textOf(last).trim();
	let m: RegExpMatchArray | null;
	if ((m = prompt.match(/^(?:run|bash)\s+([\s\S]+)/i))) return { calls: [{ name: "bash", args: { command: m[1] } }] };
	if ((m = prompt.match(/^read\s+(\S+)/i))) return { calls: [{ name: "read", args: { path: m[1] } }] };
	if ((m = prompt.match(/^write\s+(\S+)\s+([\s\S]+)/i)))
		return { calls: [{ name: "write", args: { path: m[1], content: m[2] } }] };
	if ((m = prompt.match(/^call\s+(\S+)\s*([\s\S]*)$/i))) {
		try {
			const args = m[2].trim() ? JSON.parse(m[2]) : {};
			return { text: `(mock) Calling ${m[1]}…`, calls: [{ name: m[1], args }] };
		} catch {
			return { text: `(mock) Could not parse JSON arguments: ${m[2]}` };
		}
	}
	if (/^inspect\b/i.test(prompt)) return { text: inspect(context) };

	return {
		text: [
			`(mock) You said: ${JSON.stringify(prompt.slice(0, 200))}`,
			"",
			"I am a scripted stand-in for an LLM. Try:",
			"  inspect                      show what Pi sent me",
			"  run <shell command>          I call the bash tool",
			"  read <path> / write <path> <text>",
			'  call <tool> {"arg": "value"} I call any registered tool by name',
		].join("\n"),
	};
}

const sleep = (ms: number, signal?: AbortSignal) =>
	new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
	});

let callCounter = 0;

function streamMock(model: Model<Api>, context: TranscriptContext, options?: SimpleStreamOptions): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();

	(async () => {
		const output: AssistantMessage = {
			role: "assistant",
			content: [],
			api: model.api,
			provider: model.provider,
			model: model.id,
			usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
			stopReason: "pending",
			timestamp: Date.now(),
		};

		try {
			// Pi's extension hooks (before_provider_request / after_provider_response) only work if the
			// provider calls these callbacks, exactly like the built-in providers do.
			await options?.onPayload?.({ model: model.id, messages: context.messages }, model);
			await options?.onResponse?.({ status: 200, headers: {} }, model);

			const decided = plan(context);
			stream.push({ type: "start", partial: output });

			if (decided.text) {
				output.content.push({ type: "text", text: "" });
				const index = output.content.length - 1;
				stream.push({ type: "text_start", contentIndex: index, partial: output });
				for (let i = 0; i < decided.text.length; i += 12) {
					if (options?.signal?.aborted) throw new Error("aborted");
					const delta = decided.text.slice(i, i + 12);
					(output.content[index] as { text: string }).text += delta;
					stream.push({ type: "text_delta", contentIndex: index, delta, partial: output });
					await sleep(4, options?.signal);
				}
				stream.push({ type: "text_end", contentIndex: index, content: decided.text, partial: output });
			}

			const calls = "calls" in decided ? decided.calls : [];
			for (const call of calls) {
				const toolCall: ToolCall = { type: "toolCall", id: `mock_${++callCounter}`, name: call.name, arguments: call.args as ToolCall["arguments"] };
				output.content.push(toolCall);
				const index = output.content.length - 1;
				stream.push({ type: "toolcall_start", contentIndex: index, partial: output });
				stream.push({ type: "toolcall_delta", contentIndex: index, delta: JSON.stringify(call.args), partial: output });
				stream.push({ type: "toolcall_end", contentIndex: index, toolCall, partial: output });
			}

			const promptChars = context.messages.reduce((n, m) => n + JSON.stringify(m).length, 0);
			output.usage.input = Math.ceil(promptChars / 4);
			output.usage.output = Math.ceil(JSON.stringify(output.content).length / 4);
			output.usage.totalTokens = output.usage.input + output.usage.output;
			output.stopReason = calls.length ? "toolUse" : "stop";
			stream.push({ type: "done", reason: output.stopReason, message: output });
			stream.end();
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = error instanceof Error ? error.message : String(error);
			stream.push({ type: "error", reason: output.stopReason, error: output });
			stream.end();
		}
	})();

	return stream;
}

export default function (pi: ExtensionAPI) {
	pi.registerProvider(PROVIDER, {
		name: "Mock (scripted, offline)",
		baseUrl: "http://localhost/unused",
		apiKey: "not-needed",
		api: "mock-scripted" as Api,
		models: [
			{
				id: MODEL_ID,
				name: "Scripted mock model",
				reasoning: false,
				input: ["text"],
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				contextWindow: 32_000,
				maxTokens: 4_096,
			},
		],
		streamSimple: streamMock,
	});
}
