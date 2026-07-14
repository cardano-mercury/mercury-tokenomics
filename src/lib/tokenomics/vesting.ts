import type { BucketSchedule, CurvePoint } from './types';
import { MONTH_MS, clampBigInt } from './time';

/** Fixed-point scale for fractional curve math done in bigint. */
const SCALE = 1_000_000_000n;

/**
 * Cumulative tokens (base units) intended to be unlocked for a bucket at a given
 * moment, per its declared schedule. Pure and deterministic.
 *
 * Model:
 * - Before T0: nothing is unlocked.
 * - At or after T0: the first-unlock lump sum is available.
 * - The remaining allocation (allocation minus firstUnlock) unlocks after the
 *   cliff, over the vesting window, shaped by the vesting type.
 *
 * The result is always clamped to [0, allocation].
 */
export function intendedUnlocked(schedule: BucketSchedule, at: Date): bigint {
	const { allocation, firstUnlock, cliffMonths, vestingMonths, vestingType, t0 } = schedule;

	const elapsedMs = at.getTime() - t0.getTime();
	if (elapsedMs <= 0) return 0n;

	if (vestingType === 'custom') {
		return clampBigInt(customUnlocked(schedule, elapsedMs / MONTH_MS), 0n, allocation);
	}

	const remaining = allocation - firstUnlock;
	const cliffMs = cliffMonths * MONTH_MS;
	const intoVestingMs = elapsedMs - cliffMs;

	// Before the cliff completes, only the lump sum is available.
	if (intoVestingMs <= 0) {
		return clampBigInt(firstUnlock, 0n, allocation);
	}

	const vestingMs = vestingMonths * MONTH_MS;

	// No vesting window means the remainder unlocks fully at the cliff.
	if (vestingMs <= 0) {
		return clampBigInt(firstUnlock + remaining, 0n, allocation);
	}

	const released = releasedAfterCliff(
		vestingType,
		remaining,
		intoVestingMs,
		vestingMs,
		vestingMonths
	);
	return clampBigInt(firstUnlock + released, 0n, allocation);
}

/**
 * Tokens released from the post-cliff remainder, shaped by vesting type.
 * `intoVestingMs` is time since the cliff completed; `vestingMs` is the window.
 */
function releasedAfterCliff(
	type: Exclude<BucketSchedule['vestingType'], 'custom'>,
	remaining: bigint,
	intoVestingMs: number,
	vestingMs: number,
	vestingMonths: number
): bigint {
	// Past the end of the window everything has vested.
	if (intoVestingMs >= vestingMs) return remaining;

	const e = BigInt(Math.round(intoVestingMs));
	const v = BigInt(Math.round(vestingMs));

	switch (type) {
		case 'linear':
			// Continuous straight line across the window.
			return (remaining * e) / v;
		case 'cliff': {
			// Steps once per whole month, the classic monthly unlock.
			const completedMonths = BigInt(Math.floor(intoVestingMs / MONTH_MS));
			const totalMonths = BigInt(vestingMonths);
			if (totalMonths === 0n) return remaining;
			return (remaining * completedMonths) / totalMonths;
		}
		case 'accelerated': {
			// Front-loaded ease-out: fraction = 2p - p^2, so holders receive
			// tokens faster early in the window. Computed as
			// remaining * (2*e*v - e*e) / (v*v).
			return (remaining * (2n * e * v - e * e)) / (v * v);
		}
	}
}

/** Interpolated cumulative unlock for a custom curve, in base units. */
function customUnlocked(schedule: BucketSchedule, monthsElapsed: number): bigint {
	const curve = schedule.customCurve;
	if (!curve || curve.length === 0) return 0n;

	const fraction = interpolateFraction(curve, monthsElapsed);
	const scaled = BigInt(Math.round(fraction * Number(SCALE)));
	return (schedule.allocation * scaled) / SCALE;
}

/** Linearly interpolate the cumulative fraction (0..1) at a month offset. */
function interpolateFraction(curve: CurvePoint[], months: number): number {
	const first = curve[0];
	if (months <= first.monthsAfterT0) return clamp01(first.cumulativeFraction);

	const last = curve[curve.length - 1];
	if (months >= last.monthsAfterT0) return clamp01(last.cumulativeFraction);

	for (let i = 1; i < curve.length; i++) {
		const prev = curve[i - 1];
		const next = curve[i];
		if (months <= next.monthsAfterT0) {
			const span = next.monthsAfterT0 - prev.monthsAfterT0;
			if (span <= 0) return clamp01(next.cumulativeFraction);
			const t = (months - prev.monthsAfterT0) / span;
			return clamp01(
				prev.cumulativeFraction + t * (next.cumulativeFraction - prev.cumulativeFraction)
			);
		}
	}
	return clamp01(last.cumulativeFraction);
}

function clamp01(n: number): number {
	if (n < 0) return 0;
	if (n > 1) return 1;
	return n;
}
