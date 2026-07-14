import { describe, it, expect } from 'vitest';
import { buildStatement, type BucketInput, type Movement } from './compare';
import { MONTH_MS } from './time';

const T0 = new Date('2025-01-01T00:00:00Z');

function at(months: number): Date {
	return new Date(T0.getTime() + months * MONTH_MS);
}

function linearBucket(id: string, allocation: bigint, vestingMonths: number): BucketInput {
	return {
		id,
		name: id,
		schedule: {
			allocation,
			firstUnlock: 0n,
			cliffMonths: 0,
			vestingMonths,
			vestingType: 'linear',
			t0: T0
		}
	};
}

describe('buildStatement, per-bucket series', () => {
	const buckets = [linearBucket('a', 1000n, 10)];
	const movements: Movement[] = [
		{ bucketId: 'a', at: at(2), amount: 100n },
		{ bucketId: 'a', at: at(6), amount: 50n }
	];

	it('tracks intended and cumulative actual at each point', () => {
		const s = buildStatement(buckets, movements, { points: [at(1), at(5), at(8)], asOf: at(8) });
		const series = s.buckets[0].series;
		expect(series.map((p) => p.intended)).toEqual([100n, 500n, 800n]);
		expect(series.map((p) => p.actual)).toEqual([0n, 100n, 150n]);
	});

	it('counts a movement at exactly the point time', () => {
		const s = buildStatement(buckets, movements, { points: [at(2)], asOf: at(2) });
		expect(s.buckets[0].series[0].actual).toBe(100n);
	});

	it('sorts unordered points ascending before building the series', () => {
		const s = buildStatement(buckets, movements, { points: [at(8), at(1), at(5)], asOf: at(8) });
		expect(s.buckets[0].series.map((p) => p.at.getTime())).toEqual([
			at(1).getTime(),
			at(5).getTime(),
			at(8).getTime()
		]);
	});
});

describe('buildStatement, snapshot', () => {
	it('reports difference as actual minus intended', () => {
		const buckets = [linearBucket('a', 1000n, 10)];
		const ahead: Movement[] = [{ bucketId: 'a', at: at(1), amount: 600n }];
		const s = buildStatement(buckets, ahead, { points: [at(5)], asOf: at(5) });
		expect(s.buckets[0].snapshot.intended).toBe(500n);
		expect(s.buckets[0].snapshot.actual).toBe(600n);
		expect(s.buckets[0].snapshot.difference).toBe(100n); // distributed ahead of schedule
	});

	it('is negative when distribution lags the schedule', () => {
		const buckets = [linearBucket('a', 1000n, 10)];
		const s = buildStatement(buckets, [], { points: [at(5)], asOf: at(5) });
		expect(s.buckets[0].snapshot.difference).toBe(-500n);
	});
});

describe('buildStatement, aggregation and attribution', () => {
	const buckets = [linearBucket('a', 1000n, 10), linearBucket('b', 2000n, 10)];
	const movements: Movement[] = [
		{ bucketId: 'a', at: at(1), amount: 100n },
		{ bucketId: 'b', at: at(1), amount: 300n }
	];

	it('sums buckets into the project total series and snapshot', () => {
		const s = buildStatement(buckets, movements, { points: [at(5)], asOf: at(5) });
		expect(s.total.series[0].intended).toBe(1500n); // 500 + 1000
		expect(s.total.series[0].actual).toBe(400n); // 100 + 300
		expect(s.total.snapshot.actual).toBe(400n);
		expect(s.total.snapshot.difference).toBe(-1100n);
	});

	it('attributes movements only to their own bucket', () => {
		const s = buildStatement(buckets, movements, { points: [at(5)], asOf: at(5) });
		expect(s.buckets[0].snapshot.actual).toBe(100n);
		expect(s.buckets[1].snapshot.actual).toBe(300n);
	});

	it('ignores movements referencing an unknown bucket', () => {
		const stray: Movement[] = [{ bucketId: 'ghost', at: at(1), amount: 999n }];
		const s = buildStatement(buckets, stray, { points: [at(5)], asOf: at(5) });
		expect(s.total.snapshot.actual).toBe(0n);
	});

	it('produces empty totals when there are no buckets', () => {
		const s = buildStatement([], [], { points: [at(5)], asOf: at(5) });
		expect(s.buckets).toEqual([]);
		expect(s.total.series[0].intended).toBe(0n);
		expect(s.total.series[0].actual).toBe(0n);
	});
});
