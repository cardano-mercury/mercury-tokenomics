/**
 * Folds the accumulated change fragments in `.changes/unreleased/` into CHANGELOG.md under the
 * current version, then deletes them.
 *
 * Pull requests each add their own file there rather than editing CHANGELOG.md, so they never
 * conflict with one another. This is the step that turns that pile into a release entry, grouped by
 * Keep a Changelog type and in a stable order.
 *
 * Run when preparing a release, after the final version bump:
 *
 *   npm run changelog
 *
 * Pass --dry to print the section without writing anything.
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = '.changes/unreleased';
const dry = process.argv.includes('--dry');

// Keep a Changelog's types, in the order they should appear.
const ORDER = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

if (!existsSync(DIR)) {
	console.log(`No ${DIR} directory. Nothing to compile.`);
	process.exit(0);
}

const files = readdirSync(DIR)
	.filter((f) => f.endsWith('.md'))
	.sort();

if (files.length === 0) {
	console.log('No unreleased change fragments. Nothing to compile.');
	process.exit(0);
}

/** Split `---\ntype: Fixed\n---\n\nbody` into its type and body. */
function parseFragment(path, raw) {
	const match = /^---\s*\ntype:\s*(\w+)\s*\n---\s*\n(.*)$/s.exec(raw.trim());
	if (!match) {
		console.error(`${path}: expected front matter with a "type:" field. See .changes/README.md.`);
		process.exit(1);
	}

	const [, type, body] = match;
	if (!ORDER.includes(type)) {
		console.error(`${path}: unknown type "${type}". Valid types: ${ORDER.join(', ')}.`);
		process.exit(1);
	}

	return { type, body: body.trim() };
}

const byType = new Map();
for (const file of files) {
	const path = join(DIR, file);
	const { type, body } = parseFragment(path, readFileSync(path, 'utf8'));
	if (!byType.has(type)) byType.set(type, []);
	byType.get(type).push(body);
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const today = new Date().toISOString().slice(0, 10);

let section = `## [${version}] - ${today}\n`;
for (const type of ORDER) {
	const entries = byType.get(type);
	if (!entries) continue;

	section += `\n### ${type}\n\n`;
	for (const entry of entries) {
		// A fragment may already be a bullet; do not double up.
		section += entry.startsWith('-') ? `${entry}\n` : `- ${entry}\n`;
	}
}

if (dry) {
	console.log(section);
	process.exit(0);
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
if (changelog.includes(`## [${version}]`)) {
	console.error(`CHANGELOG.md already has a section for ${version}. Bump the version first.`);
	process.exit(1);
}

// Insert directly beneath the Unreleased heading, so the newest release sits at the top.
const marker = '## [Unreleased]\n';
const at = changelog.indexOf(marker);
if (at === -1) {
	console.error('CHANGELOG.md has no "## [Unreleased]" heading to insert beneath.');
	process.exit(1);
}

const insertAt = at + marker.length;
const updated = `${changelog.slice(0, insertAt)}\n${section}${changelog.slice(insertAt)}`;
writeFileSync('CHANGELOG.md', updated);

for (const file of files) rmSync(join(DIR, file));

console.log(`Compiled ${files.length} fragment(s) into CHANGELOG.md under ${version}.`);
