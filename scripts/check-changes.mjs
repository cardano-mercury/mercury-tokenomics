/**
 * The pull request gate for versioning and the changelog.
 *
 * The version and the changelog are **outputs of a release, not inputs to a pull request**. A normal
 * pull request declares its semver impact in a change fragment and touches neither; the release step
 * (`npm run release`) consumes the fragments, computes the version from them, and writes the
 * changelog. Hand-editing either is how two pull requests end up claiming the same version, or how a
 * change ships with no entry at all.
 *
 * So this checks, for a normal pull request:
 *
 * - a fragment under `.changes/unreleased/`, either newly added or a revision to a still-pending one
 * - `package.json`'s version is untouched
 * - `CHANGELOG.md` is untouched
 *
 * The release pull request is the one thing that is supposed to do all three of those, so it is
 * detected (it removes fragments) and checked against the opposite rules instead: the version must be
 * exactly what the consumed fragments imply, and the changelog must carry that version's section.
 * Note it is detected rather than skipped: a skipped job reports no status, and a required check that
 * never reports blocks a pull request forever.
 *
 * Usage: node scripts/check-changes.mjs [baseRef]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { DIR, parseFragment, highestBump, nextVersion } from './lib/changes.mjs';

const baseRef = process.argv[2] ?? 'origin/main';

function git(args) {
	// stderr is piped: a path missing on the base ref is an expected outcome here (the first
	// release), not something to print a git error about.
	return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function fail(message) {
	console.error(`\nChange check failed.\n\n${message}\n`);
	process.exit(1);
}

function fileOnBase(path) {
	try {
		return git(['show', `${baseRef}:${path}`]);
	} catch {
		return null;
	}
}

const headVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;

const basePackage = fileOnBase('package.json');
const baseVersion = basePackage ? JSON.parse(basePackage).version : null;

let changed = [];
try {
	changed = git(['diff', '--name-status', `${baseRef}...HEAD`])
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [status, ...rest] = line.split('\t');
			return { status: status[0], path: rest[rest.length - 1] };
		});
} catch {
	fail(`Could not diff against ${baseRef}. The checkout needs full history (fetch-depth: 0).`);
}

const fragmentsIn = (statuses) =>
	changed.filter(
		(c) => statuses.includes(c.status) && c.path.startsWith(`${DIR}/`) && c.path.endsWith('.md')
	);

// A pull request describes itself by adding a fragment, or by revising one that is still pending: a
// pending fragment has not been released yet, so correcting its wording or bump is a legitimate change
// and should satisfy the gate on its own.
const described = fragmentsIn(['A', 'M']);
const removed = fragmentsIn(['D']);

const touched = (path) => changed.some((c) => c.path === path);
const versionChanged = baseVersion !== null && baseVersion !== headVersion;

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const changelogHasHeadVersion = changelog.includes(`## [${headVersion}]`);

// A release pull request consumes fragments, so it is normally the one that removes them.
//
// The second clause covers the case where a branch both adds and consumes its fragments, so the net
// diff against the base shows no fragment files at all and the first clause cannot see them. That is
// what the initial import looks like: a branch carrying the whole history onto an empty main. It is
// still checked as a release, not waved through, since the rules below apply either way.
const isRelease =
	removed.length > 0 ||
	(changelogHasHeadVersion && touched('CHANGELOG.md') && (baseVersion === null || versionChanged));

if (isRelease) {
	// Recreate the fragments it consumed, and confirm the version it claims is the one they imply.
	const consumed = removed.map((c) => {
		const raw = fileOnBase(c.path);
		if (raw === null) fail(`${c.path} was removed but is not on ${baseRef}. Rebase.`);
		return parseFragment(c.path, raw);
	});

	// The base may predate package.json entirely (the first release onto an empty main), in which case
	// there is no version to compute the next one from and only the changelog can be checked.
	if (baseVersion !== null) {
		const expected = nextVersion(baseVersion, highestBump(consumed));

		if (headVersion !== expected) {
			fail(
				`This is a release pull request: it consumes ${consumed.length} fragment(s), whose highest\n` +
					`bump is "${highestBump(consumed)}". From ${baseVersion} that means ${expected}, but\n` +
					`package.json says ${headVersion}.\n\n` +
					`Do not hand-edit the version. Run: npm run release`
			);
		}
	}

	if (!changelogHasHeadVersion) {
		fail(`CHANGELOG.md has no "## [${headVersion}]" section. Run: npm run release`);
	}

	console.log(
		`Release pull request: ${baseVersion} -> ${headVersion}, ${consumed.length} fragment(s) consumed. OK.`
	);
	process.exit(0);
}

// A normal pull request.
if (described.length === 0) {
	fail(
		`No change fragment.\n\n` +
			`Describe this change in a new file under ${DIR}/, for example\n` +
			`${DIR}/fix-vesting-rounding.md:\n\n` +
			`    ---\n` +
			`    type: Fixed\n` +
			`    bump: patch\n` +
			`    ---\n\n` +
			`    Vesting no longer rounds a bucket's final month down to zero.\n\n` +
			`One file per change, so pull requests never conflict over the changelog.\n` +
			`A change that ships nothing user-visible still says so, in a fragment.`
	);
}

// Validate each one, so a malformed fragment fails here and not at release time.
for (const { path } of described) {
	try {
		parseFragment(path, readFileSync(path, 'utf8'));
	} catch (error) {
		fail(error.message);
	}
}

if (versionChanged) {
	fail(
		`package.json's version was changed by hand (${baseVersion} -> ${headVersion}).\n\n` +
			`The version is an output of a release, not an input to a pull request. Declare the impact\n` +
			`with "bump:" in your change fragment instead, and leave the version alone. The release\n` +
			`computes it from the fragments it consumes.`
	);
}

if (touched('CHANGELOG.md')) {
	fail(
		`CHANGELOG.md was edited by hand.\n\n` +
			`The changelog is written by the release from the accumulated fragments. Editing it in a\n` +
			`pull request is what makes every open pull request conflict with every other one.`
	);
}

const bumps = described.map((c) => parseFragment(c.path, readFileSync(c.path, 'utf8')).bump);
console.log(
	`${described.length} change fragment(s), highest bump "${highestBump(bumps.map((bump) => ({ bump })))}". Version untouched. OK.`
);
