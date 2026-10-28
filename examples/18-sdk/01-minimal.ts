/**
 * SDK 01 - minimal: create a session, send a prompt, stream the answer.
 *
 *   node examples/18-sdk/01-minimal.ts
 *
 * The SDK embeds the SAME agent loop the `pi` CLI runs, in your own Node process.
 * prompt() resolves when the whole run (including tool calls) is finished.
 */
import { createMockSession, streamTextToStdout } from "./_mock-session.ts";

const session = await createMockSession();
const unsubscribe = streamTextToStdout(session);
try {
	await session.prompt("inspect");
	console.log(`\n\nmodel: ${session.model?.provider}/${session.model?.id}`);
	console.log(`messages in session: ${session.messages.length}`);
} finally {
	unsubscribe();
	session.dispose(); // aborts work, detaches listeners, invalidates extension contexts
}
