import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const execute = vi.fn();

vi.mock('$lib/server/db', () => ({ db: { execute: () => execute() } }));

const { GET } = await import('./+server');

describe('GET /healthz', () => {
	beforeEach(() => {
		execute.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reports ok when the database answers', async () => {
		execute.mockResolvedValue([{ '?column?': 1 }]);

		const res = await GET();

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ status: 'ok', database: 'ok' });
	});

	it('reports unhealthy when the database query fails', async () => {
		execute.mockRejectedValue(new Error('ECONNREFUSED'));

		const res = await GET();

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toEqual({ status: 'error', database: 'unreachable' });
	});

	it('reports unhealthy rather than hanging when the database never answers', async () => {
		vi.useFakeTimers();
		execute.mockReturnValue(new Promise(() => {})); // never settles

		const pending = GET();
		await vi.advanceTimersByTimeAsync(3000);
		const res = await pending;

		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toEqual({ status: 'error', database: 'unreachable' });
	});

	it('is never cached, so a stale probe cannot mask an outage', async () => {
		execute.mockResolvedValue([{ '?column?': 1 }]);

		const res = await GET();

		expect(res.headers.get('cache-control')).toBe('no-store');
	});
});
