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
			typescript: {
				config: (config) => ({
					...config,
					include: [...config.include, '../drizzle.config.ts']
				})
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		// Thresholds are enforced in CI (`npm run test:coverage`), not aspirational. They sit at the
		// level the suite currently reaches, so coverage cannot regress; raise them when it improves.
		//
		// The denominator is the logic-bearing modules: the pure domain, the validators, and the
		// parsing half of the chain client. Declarative files (the drizzle schema, barrels, type
		// files), configuration (`server/auth.ts`), thin re-export seams (`server/cardano.ts`) and
		// Svelte components are excluded, since a percentage over them measures nothing.
		coverage: {
			provider: 'v8',
			include: [
				'src/lib/tokenomics/**/*.ts',
				'src/lib/format.ts',
				'src/lib/auth/validation.ts',
				'src/lib/projects/validation.ts',
				'src/lib/server/koios.ts',
				'src/lib/server/declaration.ts',
				'src/lib/server/email.ts'
			],
			exclude: ['**/*.spec.ts', '**/types.ts', '**/index.ts'],
			thresholds: {
				statements: 85,
				branches: 85,
				functions: 90,
				lines: 88
			}
		},
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
