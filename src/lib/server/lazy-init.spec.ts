import { describe, it, expect, vi } from 'vitest';

/**
 * SvelteKit's postbuild `analyse` step imports every server module to read its route config, so
 * anything done at module scope runs during `npm run build`. Connecting to the database, or
 * constructing Better Auth, at import time made the build require a live `DATABASE_URL` and a real
 * `BETTER_AUTH_SECRET`, which fails in a Docker build where there is no `.env` and there had better
 * not be.
 *
 * These pin the fix: importing the modules with an empty environment must not throw. The failure
 * has to wait until something actually uses the connection.
 */

async function importWithEmptyEnv(path: string) {
	vi.resetModules();
	vi.doMock('$env/dynamic/private', () => ({ env: {} }));
	vi.doMock('$app/server', () => ({ getRequestEvent: () => ({}) }));
	vi.doMock('$app/environment', () => ({ dev: false }));
	return import(path);
}

describe('module-scope side effects', () => {
	it('imports the database module with no environment at all', async () => {
		await expect(importWithEmptyEnv('./db/index')).resolves.toBeDefined();
	});

	it('imports the auth module with no environment at all', async () => {
		await expect(importWithEmptyEnv('./auth')).resolves.toBeDefined();
	});

	it('still fails on first database use when DATABASE_URL is missing', async () => {
		const { db } = await importWithEmptyEnv('./db/index');

		// The error is deferred to use, not skipped: a missing variable must surface somewhere.
		expect(() => db.select()).toThrow(/DATABASE_URL is not set/);
	});
});
