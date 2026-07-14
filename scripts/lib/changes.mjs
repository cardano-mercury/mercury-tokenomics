/**
 * Shared reading and semver logic for change fragments, used by the pull request gate
 * (`check-changes.mjs`) and the release step (`release.mjs`) so the two cannot disagree about what a
 * fragment means or what version it implies.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const DIR = '.changes/unreleased';

/** Keep a Changelog's types, in the order they appear in a release section. */
export const TYPES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

/** Ordered by severity, so the largest bump across a release's fragments wins. */
export const BUMPS = ['patch', 'minor', 'major'];

/**
 * Parse `---\ntype: Fixed\nbump: patch\n---\n\nbody` into its parts.
 * Throws with the file name, since these are read in bulk.
 */
export function parseFragment(path, raw) {
	const match = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(raw.trim());
	if (!match) {
		throw new Error(`${path}: expected front matter delimited by ---. See .changes/README.md.`);
	}

	const [, frontMatter, body] = match;
	const fields = {};
	for (const line of frontMatter.split('\n')) {
		const field = /^(\w+):\s*(.+?)\s*$/.exec(line.trim());
		if (field) fields[field[1]] = field[2];
	}

	if (!TYPES.includes(fields.type)) {
		throw new Error(
			`${path}: type must be one of ${TYPES.join(', ')}. Got: ${fields.type ?? 'none'}`
		);
	}

	if (!BUMPS.includes(fields.bump)) {
		throw new Error(
			`${path}: bump must be one of ${BUMPS.join(', ')}. Got: ${fields.bump ?? 'none'}`
		);
	}

	if (body.trim() === '') throw new Error(`${path}: the fragment has no body.`);

	return { type: fields.type, bump: fields.bump, body: body.trim() };
}

/** Every fragment currently accumulated, sorted by file name for a stable changelog order. */
export function readFragments() {
	if (!existsSync(DIR)) return [];

	return readdirSync(DIR)
		.filter((f) => f.endsWith('.md'))
		.sort()
		.map((file) => {
			const path = join(DIR, file);
			return { file, ...parseFragment(path, readFileSync(path, 'utf8')) };
		});
}

/** The largest bump across a set of fragments. */
export function highestBump(fragments) {
	return fragments.reduce(
		(highest, f) => (BUMPS.indexOf(f.bump) > BUMPS.indexOf(highest) ? f.bump : highest),
		'patch'
	);
}

/**
 * Apply a bump to a version.
 *
 * Below 1.0 a breaking change raises the minor, because that is how 0.x says "this breaks you".
 * Hiding a break in a patch because the number looks less alarming is how a consumer gets surprised.
 */
export function nextVersion(current, bump) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
	if (!match) throw new Error(`Not a semver version: ${current}`);

	const [major, minor, patch] = match.slice(1).map(Number);
	const preRelease = major === 0;

	if (bump === 'major') {
		return preRelease ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
	}
	if (bump === 'minor') {
		return `${major}.${minor + 1}.0`;
	}
	return `${major}.${minor}.${patch + 1}`;
}
