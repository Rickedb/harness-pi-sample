/**
 * Shared helper for the SDK examples: build a session that talks to the offline mock model.
 *
 * Everything here is what you would ALSO do with a real model - the only difference is that a real
 * app would skip `mockProvider` and the setModel call (the model then comes from settings / /login).
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type CreateAgentSessionOptions,
	createAgentSession,
	DefaultResourceLoader,
	type ExtensionFactory,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import mockProvider from "../00-mock-provider/mock-provider.ts";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const AGENT_DIR = join(ROOT, ".pi-agent-dir");

export async function createMockSession(
	options: {
		extensions?: ExtensionFactory[];
		loader?: ConstructorParameters<typeof DefaultResourceLoader>[0] extends infer T ? Partial<T> : never;
	} & Pick<CreateAgentSessionOptions, "tools" | "customTools" | "sessionManager"> = {},
) {
	const resourceLoader = new DefaultResourceLoader({
		cwd: ROOT,
		agentDir: AGENT_DIR,
		// Start from nothing so results don't depend on what is installed on your machine:
		noExtensions: true,
		noSkills: true,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
		...options.loader,
		// "Inline extensions" are just extension factories passed as code instead of files.
		extensionFactories: [mockProvider, ...(options.extensions ?? [])],
	});
	await resourceLoader.reload();

	const { session } = await createAgentSession({
		cwd: ROOT,
		agentDir: AGENT_DIR,
		resourceLoader,
		sessionManager: options.sessionManager ?? SessionManager.inMemory(ROOT),
		tools: options.tools,
		customTools: options.customTools,
	});

	const mock = session.modelRuntime.getModel("mock", "scripted");
	if (!mock) throw new Error("mock model was not registered");
	await session.setModel(mock);
	return session;
}

/** Print assistant text as it streams. Returns the unsubscribe function. */
export function streamTextToStdout(session: Awaited<ReturnType<typeof createMockSession>>) {
	return session.subscribe((event) => {
		if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
			process.stdout.write(event.assistantMessageEvent.delta);
		}
	});
}
