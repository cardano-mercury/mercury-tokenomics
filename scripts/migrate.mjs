/**
 * Applies tokenomics' committed migrations to the shared Postgres database.
 *
 * Uses drizzle-orm's runtime migrator rather than `drizzle-kit migrate`, so the production image
 * does not need drizzle-kit (a devDependency) or the TypeScript schema. It reads the same
 * `drizzle/` folder and the same dedicated journal table, so it is interchangeable with
 * `npm run db:migrate` in development.
 *
 * This only creates tokenomics' own `tokenomics_*` tables. The shared auth tables
 * (user/session/account/verification/two_factor) are owned by mercury-core and must already exist:
 * `tokenomics_project.owner_id` foreign-keys to `user`, so core's migration has to run first.
 *
 * Run with: npm run db:migrate:deploy
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

// max: 1 because migrations must run sequentially on a single connection.
const sql = postgres(url, { max: 1 });

try {
	await migrate(drizzle(sql), {
		migrationsFolder: 'drizzle',
		migrationsTable: '__drizzle_migrations_tokenomics',
		migrationsSchema: 'public'
	});
	console.log('Tokenomics migrations applied.');
} catch (error) {
	console.error('Migration failed:', error);
	process.exitCode = 1;
} finally {
	await sql.end();
}
