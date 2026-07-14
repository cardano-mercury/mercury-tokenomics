/**
 * Prepares a release: computes the next version from the accumulated change fragments, writes the
 * changelog section, bumps package.json, and deletes the fragments.
 *
 * The version and the changelog are outputs of this step. Nothing else should write either, which is
 * why the pull request gate rejects a hand-edited version or changelog.
 *
 *   npm run release          # write it
 *   npm run release -- --dry # print what it would do, touch nothing
 *
 * Then commit the result, open it as a pull request (it runs the same CI as any other), and once it
 * is merged, tag the merge commit `v<version>`. The tag is what publishes the images, and the release
 * workflow refuses to publish if the tag and package.json disagree.
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DIR, TYPES, readFragments, highestBump, nextVersion } from './lib/changes.mjs';

const dry = process.argv.includes('--dry');

let fragments;
try {
	fragments = readFragments();
} catch (error) {
	console.error(error.message);
	process.exit(1);
}

if (fragments.length === 0) {
	console.error(`No fragments in ${DIR}. There is nothing to release.`);
	process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const bump = highestBump(fragments);
const version = nextVersion(pkg.version, bump);
const today = new Date().toISOString().slice(0, 10);

let section = `## [${version}] - ${today}\n`;
for (const type of TYPES) {
	const entries = fragments.filter((f) => f.type === type);
	if (entries.length === 0) continue;

	section += `\n### ${type}\n\n`;
	for (const { body } of entries) {
		// A fragment may already be written as a bullet; do not double up. Continuation lines are
		// indented so a multi-line body stays inside its list item instead of ending the list.
		const lines = body.split('\n');
		const first = lines[0].startsWith('-') ? lines[0] : `- ${lines[0]}`;
		const rest = lines.slice(1).map((line) => (line.trim() === '' ? '' : `  ${line}`));
		section += [first, ...rest].join('\n') + '\n';
	}
}

if (dry) {
	console.log(`${pkg.version} -> ${version} (highest bump: ${bump})\n`);
	console.log(section);
	console.log(`Would consume ${fragments.length} fragment(s).`);
	process.exit(0);
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
if (changelog.includes(`## [${version}]`)) {
	console.error(`CHANGELOG.md already has a section for ${version}.`);
	process.exit(1);
}

const marker = '## [Unreleased]\n';
const at = changelog.indexOf(marker);
if (at === -1) {
	console.error('CHANGELOG.md has no "## [Unreleased]" heading to insert beneath.');
	process.exit(1);
}

const insertAt = at + marker.length;
writeFileSync(
	'CHANGELOG.md',
	`${changelog.slice(0, insertAt)}\n${section}${changelog.slice(insertAt)}`
);

pkg.version = version;
writeFileSync('package.json', `${JSON.stringify(pkg, null, '\t')}\n`);

for (const { file } of fragments) rmSync(join(DIR, file));

console.log(`Released ${version} (${bump}) from ${fragments.length} fragment(s).`);
console.log(`Commit, merge, then tag v${version}.`);
