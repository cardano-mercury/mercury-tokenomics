import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// @cardano-mercury/core is linked via file: and resolves drizzle-orm from its own
			// location, so without this the app and core would compile against two drizzle-orm
			// type instances (incompatible PgColumn types). Aliasing the directory unifies the
			// type resolution; it is merged into the generated tsconfig paths alongside $lib.
			// (better-auth is not aliased here: its subpaths are package "exports", not real
			// folders, so a directory alias breaks them. Runtime dedupe below covers it.)
			alias: {
				'drizzle-orm': 'node_modules/drizzle-orm'
			},
			typescript: {
				config: (config) => ({
					...config,
					include: [...config.include, '../drizzle.config.ts']
				})
			}
		})
	],
	// Force a single runtime instance of these shared packages across the app and core.
	resolve: { dedupe: ['drizzle-orm', 'better-auth'] },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
