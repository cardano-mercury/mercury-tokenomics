import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

/**
 * Liveness and readiness probe for the container healthcheck. It round-trips the database rather
 * than just returning 200, so a container that cannot reach the shared Postgres is reported
 * unhealthy instead of silently serving errors.
 *
 * The check is bounded well under the healthcheck's own timeout: a probe that hangs is useless,
 * since the orchestrator cannot distinguish "slow" from "dead".
 */
const TIMEOUT_MS = 3000;

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
	});
}

export async function GET() {
	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		const timeout = new Promise<never>((_, reject) => {
			timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
		});
		await Promise.race([db.execute(sql`select 1`), timeout]);
	} catch {
		return json({ status: 'error', database: 'unreachable' }, 503);
	} finally {
		clearTimeout(timer);
	}

	return json({ status: 'ok', database: 'ok' }, 200);
}
