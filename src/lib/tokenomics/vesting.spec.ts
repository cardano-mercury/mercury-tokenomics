import { describe, it, expect } from 'vitest';
import { intendedUnlocked } from './vesting';
import { MONTH_MS } from './time';
import type { BucketSchedule, CurvePoint } from './types';

const T0 = new Date('2025-01-01T00:00:00Z');

/** Date at a (possibly fractional) number of months after T0. */
function at(months: number): Date {
	return new Date(T0.getTime() + months * MONTH_MS);
}

function schedule(overrides: Partial<BucketSchedule> = {}): BucketSchedule {
	return {
		allocation: 1000n,
		firstUnlock: 0n,
		cliffMonths: 0,
		vestingMonths: 10,
		vestingType: 'linear',
		t0: T0,
		...overrides
	};
}

describe('intendedUnlocked, boundaries around T0', () => {
	it('unlocks nothing before T0', () => {
		const s = schedule({ firstUnlock: 100n });
		expect(intendedUnlocked(s, new Date(T0.getTime() - 1))).toBe(0n);
		expect(intendedUnlocked(s, at(-3))).toBe(0n);
	});

	it('unlocks nothing exactly at T0 (T0 is the open boundary)', () => {
		expect(intendedUnlocked(schedule({ firstUnlock: 100n }), T0)).toBe(0n);
	});

	it('releases the first-unlock lump sum just after T0', () => {
		const s = schedule({ firstUnlock: 100n, cliffMonths: 6 });
		expect(intendedUnlocked(s, at(0.001))).toBe(100n);
		expect(intendedUnlocked(s, at(3))).toBe(100n);
	});
});

describe('linear vesting', () => {
	it('is straight-line across the window', () => {
		const s = schedule();
		expect(intendedUnlocked(s, at(2.5))).toBe(250n);
		expect(intendedUnlocked(s, at(5))).toBe(500n);
		expect(intendedUnlocked(s, at(10))).toBe(1000n);
	});

	it('never exceeds the allocation past the window', () => {
		expect(intendedUnlocked(schedule(), at(99))).toBe(1000n);
	});

	it('respects a cliff before the linear ramp begins', () => {
		const s = schedule({ allocation: 1000n, firstUnlock: 100n, cliffMonths: 6, vestingMonths: 12 });
		expect(intendedUnlocked(s, at(6))).toBe(100n); // at the cliff, lump sum only
		expect(intendedUnlocked(s, at(12))).toBe(550n); // halfway through vesting
		expect(intendedUnlocked(s, at(18))).toBe(1000n); // fully vested
	});
});

describe('cliff (monthly stepped) vesting', () => {
	const s = schedule({ allocation: 1200n, vestingMonths: 12, vestingType: 'cliff' });

	it('does not release within an incomplete month', () => {
		expect(intendedUnlocked(s, at(0.5))).toBe(0n);
		expect(intendedUnlocked(s, at(1.9))).toBe(100n);
	});

	it('steps once per completed month', () => {
		expect(intendedUnlocked(s, at(1))).toBe(100n);
		expect(intendedUnlocked(s, at(6))).toBe(600n);
	});

	it('is fully vested at the end of the window', () => {
		expect(intendedUnlocked(s, at(12))).toBe(1200n);
	});
});

describe('accelerated vesting', () => {
	const s = schedule({ allocation: 1000n, vestingMonths: 10, vestingType: 'accelerated' });

	it('is front-loaded: 2p - p^2 at the midpoint', () => {
		expect(intendedUnlocked(s, at(5))).toBe(750n);
	});

	it('releases faster than linear at the same point', () => {
		const linear = intendedUnlocked(schedule(), at(3));
		const accel = intendedUnlocked(s, at(3));
		expect(accel).toBeGreaterThan(linear);
	});

	it('completes exactly at the end of the window', () => {
		expect(intendedUnlocked(s, at(10))).toBe(1000n);
	});
});

describe('custom vesting', () => {
	const curve: CurvePoint[] = [
		{ monthsAfterT0: 0, cumulativeFraction: 0 },
		{ monthsAfterT0: 6, cumulativeFraction: 0.5 },
		{ monthsAfterT0: 12, cumulativeFraction: 1 }
	];
	const s = schedule({ allocation: 1000n, vestingType: 'custom', customCurve: curve });

	it('interpolates linearly between curve points', () => {
		expect(intendedUnlocked(s, at(3))).toBe(250n);
		expect(intendedUnlocked(s, at(6))).toBe(500n);
		expect(intendedUnlocked(s, at(9))).toBe(750n);
	});

	it('clamps to the final fraction beyond the last point', () => {
		expect(intendedUnlocked(s, at(24))).toBe(1000n);
	});

	it('returns zero when the custom curve is missing or empty', () => {
		expect(intendedUnlocked(schedule({ vestingType: 'custom' }), at(6))).toBe(0n);
		expect(intendedUnlocked(schedule({ vestingType: 'custom', customCurve: [] }), at(6))).toBe(0n);
	});
});

describe('degenerate schedules', () => {
	it('releases the remainder fully at the cliff when there is no vesting window', () => {
		const s = schedule({ allocation: 1000n, firstUnlock: 100n, cliffMonths: 3, vestingMonths: 0 });
		expect(intendedUnlocked(s, at(2))).toBe(100n); // before cliff
		expect(intendedUnlocked(s, at(4))).toBe(1000n); // after cliff, all at once
	});

	it('clamps a first-unlock larger than the allocation', () => {
		const s = schedule({ allocation: 100n, firstUnlock: 150n });
		expect(intendedUnlocked(s, at(1))).toBe(100n);
	});

	it('handles a zero allocation', () => {
		expect(intendedUnlocked(schedule({ allocation: 0n }), at(5))).toBe(0n);
	});
});
