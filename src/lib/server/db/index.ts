import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

type Database = PostgresJsDatabase<typeof schema>;

let instance: Database | undefined;

function connect(): Database {
	if (instance) return instance;

	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

	// connect_timeout bounds how long a query waits on an unreachable database. Without it
	// postgres.js retries indefinitely, so a request hangs rather than failing, and the container
	// healthcheck times out instead of reporting unhealthy.
	instance = drizzle(postgres(env.DATABASE_URL, { connect_timeout: 10 }), { schema });
	return instance;
}

/**
 * The database handle, connected on first use rather than at import.
 *
 * SvelteKit's postbuild `analyse` step imports every server module to read its route config, so
 * anything done at module scope runs during `npm run build`. Connecting there would make the build
 * require a live `DATABASE_URL`, which fails in a Docker build, where there is no `.env` and there
 * had better not be. Deferring behind a proxy keeps the exported type and every call site unchanged,
 * and a missing variable surfaces on the first request that touches the database, which is where it
 * is actionable.
 */
export const db: Database = new Proxy({} as Database, {
	get(_target, prop) {
		const target = connect();
		const value = Reflect.get(target, prop);
		return typeof value === 'function' ? value.bind(target) : value;
	}
});
