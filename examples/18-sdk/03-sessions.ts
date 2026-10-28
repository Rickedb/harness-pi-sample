/**
 * SDK 03 - sessions are files (JSONL trees). Create one, close it, reopen it, list them.
 *
 *   node examples/18-sdk/03-sessions.ts
 *
 * SessionManager.inMemory()      throw-away, nothing on disk
 * SessionManager.create(cwd,dir) new persistent session
 * SessionManager.continueRecent  reopen the latest one for a cwd
 * SessionManager.list            enumerate what is on disk
 */
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { createMockSession, ROOT } from "./_mock-session.ts";

const dir = join(ROOT, ".sessions", "sdk-03"); // gitignored
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const first = await createMockSession({ sessionManager: SessionManager.create(ROOT, dir) });
await first.prompt("first prompt");
console.log("session file:", first.sessionFile);
first.dispose();

// A new process could do exactly this later: the conversation comes back from disk.
const second = await createMockSession({ sessionManager: SessionManager.continueRecent(ROOT, dir) });
console.log("messages after reopen:", second.messages.length);
await second.prompt("second prompt");
console.log("messages after 2nd prompt:", second.messages.length);
second.dispose();

const infos = await SessionManager.list(ROOT, dir);
console.log(`sessions in ${dir}:`, infos.map((s) => ({ messages: s.messageCount })));
