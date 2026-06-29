/**
 * Time helpers for vesting math. A "month" is treated as a fixed average length
 * so that cliffs and vesting periods produce smooth, deterministic curves. This
 * is a deliberate simplification for the proof of concept: schedules are
 * expressed in months, and using a fixed month avoids calendar drift between
 * the intended curve and the time axis of the charts.
 */

/** Average month length in milliseconds (365.25 / 12 days). */
export const MONTH_MS = 2_629_800_000;

/** Milliseconds elapsed from `from` to `to`. Negative if `to` precedes `from`. */
export function msBetween(from: Date, to: Date): number {
	return to.getTime() - from.getTime();
}

/** Add a whole or fractional number of months to a date. */
export function addMonths(date: Date, months: number): Date {
	return new Date(date.getTime() + months * MONTH_MS);
}

/** Clamp a bigint to the inclusive range [min, max]. */
export function clampBigInt(value: bigint, min: bigint, max: bigint): bigint {
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
