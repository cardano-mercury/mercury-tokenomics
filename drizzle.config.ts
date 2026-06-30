import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	// Only manage tokenomics' own prefixed tables on the shared database. The auth
	// tables (owned by mercury-core) and financials' tables are left untouched.
	tablesFilter: ['tokenomics_*'],
	// A dedicated migration journal so tokenomics and financials do not share one
	// history table on the common database.
	migrations: { table: '__drizzle_migrations_tokenomics', schema: 'public' },
	verbose: true,
	strict: true
});
