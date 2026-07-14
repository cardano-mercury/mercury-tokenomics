import { describe, it, expect } from 'vitest';
import {
	assembleStatement,
	monthlyPoints,
	UNASSIGNED_BUCKET_ID,
	type BucketRow
} from './statement';
import { MONTH_MS } from './time';

const T0 = new Date('2025-01-01T00:00:00Z');

function at(months: number): Date {
	return new Date(T0.getTime() + months * MONTH_MS);
}

const buckets: BucketRow[] = [
	{
		id: 'team',
		name: 'Team',
		allocation: '1000',
		firstUnlock: '0',
		cliffMonths: 0,
		vestingMonths: 10,
		vestingType: 'linear'
	}
];

describe('monthlyPoints', () => {
	it('includes the start and end and steps monthly', () => {
		const pts = monthlyPoints(T0, at(3));
		expect(pts[0].getTime()).toBe(T0.getTime());
		expect(pts.at(-1)?.getTime()).toBe(at(3).getTime());
		expect(pts.length).toBe(4);
	});

	it('caps the number of points by widening the step', () => {
		const pts = monthlyPoints(T0, at(120), 12);
		expect(pts.length).toBeLessThanOrEqual(13);
	});

	it('returns a single point when the range is empty', () => {
		expect(monthlyPoints(at(5), T0)).toEqual([T0]);
	});
});

describe('assembleStatement', () => {
	it('builds promised and delivered for a bucket from outflows', () => {
		const statement = assembleStatement(
			{ t0: T0 },
			buckets,
			[{ bucketId: 'team', amount: '100', occurredAt: at(2), direction: 'out' }],
			{ asOf: at(5), points: [at(5)] }
		);
		expect(statement.buckets[0].snapshot.intended).toBe(500n);
		expect(statement.buckets[0].snapshot.actual).toBe(100n);
	});

	it('ignores inbound movements', () => {
		const statement = assembleStatement(
			{ t0: T0 },
			buckets,
			[{ bucketId: 'team', amount: '100', occurredAt: at(2), direction: 'in' }],
			{ asOf: at(5), points: [at(5)] }
		);
		expect(statement.buckets[0].snapshot.actual).toBe(0n);
	});

	it('gathers unknown-bucket outflows under a synthetic Unassigned bucket', () => {
		const statement = assembleStatement(
			{ t0: T0 },
			buckets,
			[{ bucketId: 'ghost', amount: '40', occurredAt: at(1), direction: 'out' }],
			{ asOf: at(5), points: [at(5)] }
		);
		const unassigned = statement.buckets.find((b) => b.bucketId === UNASSIGNED_BUCKET_ID);
		expect(unassigned?.snapshot.actual).toBe(40n);
		expect(unassigned?.snapshot.intended).toBe(0n);
		expect(statement.total.snapshot.actual).toBe(40n);
	});

	it('uses a per-bucket T0 override when present', () => {
		const overridden: BucketRow[] = [{ ...buckets[0], t0Override: at(5) }];
		const statement = assembleStatement({ t0: T0 }, overridden, [], {
			asOf: at(7),
			points: [at(7)]
		});
		// Two months into a ten-month linear schedule that starts at the override.
		expect(statement.buckets[0].snapshot.intended).toBe(200n);
	});
});
