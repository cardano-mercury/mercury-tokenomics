/**
 * The pull request gate for versioning and the changelog.
 *
 * Two rules, both enforced rather than left to convention:
 *
 * 1. The version in package.json must be higher than the base branch's. The release workflow tags
 *    `v<version>`, so merging without a bump means a tag that already exists.
 * 2. The change must be described. Descriptions are accumulated as one file per change under
 *    `.changes/unreleased/`, NOT by editing CHANGELOG.md directly: every pull request editing the
 *    same region of one file is a standing merge conflict, and the conflict is resolved by hand at
 *    exactly the moment nobody is paying attention to it. A new file per change never conflicts.
 *    `scripts/compile-changelog.mjs` folds them into CHANGELOG.md at release time.
 *
 * A release pull request (one that compiles the fragments away) satisfies rule 2 by adding the
 * version's section to CHANGELOG.md instead, so it is accepted either way.
 *
 * Usage: node scripts/check-changes.mjs [baseRef]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseRef = process.argv[2] ?? 'origin/main';

/** Parse a semver core into comparable numbers. Pre-release and build metadata are not compared. */
function parse(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
	if (!match) throw new Error(`Not a semver version: ${version}`);
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Positive when a is above b, negative when below, zero when equal. */
function compare(a, b) {
	const left = parse(a);
	const right = parse(b);
	for (let i = 0; i < 3; i++) {
		if (left[i] !== right[i]) return left[i] - right[i];
	}
	return 0;
}

function git(args) {
	// stderr is piped rather than inherited: a missing path on the base ref is an expected outcome
	// here (the first release), not something to print a git error about.
	return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function fail(message) {
	console.error(`\nChange check failed.\n\n${message}\n`);
	process.exit(1);
}

const head = JSON.parse(readFileSync('package.json', 'utf8')).version;

// The base may predate package.json entirely (an empty or docs-only main). That is the first
// release, and there is nothing to compare against.
let base = null;
try {
	base = JSON.parse(git(['show', `${baseRef}:package.json`])).version;
} catch {
	console.log(`No package.json on ${baseRef}: treating ${head} as the first release.`);
}

if (base !== null) {
	if (compare(head, base) === 0) {
		fail(
			`The version is still ${head}, the same as ${baseRef}.\n\n` +
				`Bump "version" in package.json. While below 1.0 that is the minor for a feature and\n` +
				`the patch for a fix. If someone else's bump landed first, rebase and bump again from\n` +
				`the new base.`
		);
	}

	if (compare(head, base) < 0) {
		fail(`The version went backwards: ${base} on ${baseRef}, ${head} here.`);
	}
}

// Rule 2: either a new change fragment, or (for a release PR) the version's changelog section.
const changedFiles =
	base === null ? [] : git(['diff', '--name-only', `${baseRef}...HEAD`]).split('\n');

const addedFragments = changedFiles.filter(
	(f) => f.startsWith('.changes/unreleased/') && f.endsWith('.md')
);

const changelogHasVersion = readFileSync('CHANGELOG.md', 'utf8').includes(`## [${head}]`);

if (addedFragments.length === 0 && !changelogHasVersion) {
	fail(
		`No change description found.\n\n` +
			`Add a file under .changes/unreleased/ describing this change, for example\n` +
			`.changes/unreleased/fix-vesting-rounding.md:\n\n` +
			`    ---\n` +
			`    type: Fixed\n` +
			`    ---\n\n` +
			`    Vesting no longer rounds a bucket's final month down to zero.\n\n` +
			`One file per change, so pull requests never conflict over CHANGELOG.md.\n` +
			`Valid types: Added, Changed, Deprecated, Removed, Fixed, Security.`
	);
}

const described = addedFragments.length
	? `${addedFragments.length} change fragment(s)`
	: `a CHANGELOG.md section`;

console.log(`Version ${base ?? '(none)'} -> ${head}, described by ${described}. OK.`);
