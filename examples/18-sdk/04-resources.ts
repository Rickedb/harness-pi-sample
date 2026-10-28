/**
 * SDK 04 - resources: ask what Pi would discover, and filter/override it in code.
 *
 *   node examples/18-sdk/04-resources.ts
 *
 * DefaultResourceLoader does the same discovery as the CLI (skills, prompts, themes, extensions,
 * AGENTS.md). Every kind has an `...Override` hook so a host app can filter or add resources.
 *
 * Note the output: besides the two paths added in code, it also lists `bundle-skill` and
 * `/bundle-hello`. Those come from this repo's .pi/settings.json (its `packages` entry): the SDK
 * honours project settings for `cwd` exactly like the CLI does. Pass another `cwd` to avoid that.
 */
import { DefaultResourceLoader } from "@earendil-works/pi-coding-agent";
import { AGENT_DIR, ROOT } from "./_mock-session.ts";

const loader = new DefaultResourceLoader({
	cwd: ROOT,
	agentDir: AGENT_DIR,
	noExtensions: true,
	noThemes: true,
	noContextFiles: true,
	additionalSkillPaths: [`${ROOT}/examples/05-skills`],
	additionalPromptTemplatePaths: [`${ROOT}/examples/04-prompt-templates`],
	// Example override: hide any skill that is manual-only.
	skillsOverride: (base) => ({ ...base, skills: base.skills.filter((skill) => !skill.disableModelInvocation) }),
});
await loader.reload();

console.log("skills :", loader.getSkills().skills.map((s) => s.name));
console.log("prompts:", loader.getPrompts().prompts.map((p) => `/${p.name}`));
