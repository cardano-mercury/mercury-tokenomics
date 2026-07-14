/**
 * Pure domain types for the tokenomics engine. No SvelteKit, database, or
 * network imports belong in this directory. All token amounts are bigint base
 * units (smallest indivisible unit of the token, i.e. raw on-chain quantity).
 */

export type VestingType = 'linear' | 'cliff' | 'accelerated' | 'custom';

export type Network = 'mainnet' | 'preprod' | 'preview';

/** A point on a custom vesting curve: cumulative fraction unlocked at a time. */
export interface CurvePoint {
	/** Whole or fractional months after T0. */
	monthsAfterT0: number;
	/** Cumulative fraction of the bucket allocation unlocked by this time, 0..1. */
	cumulativeFraction: number;
}

/** Everything needed to compute a single bucket's intended unlock curve. */
export interface BucketSchedule {
	/** Total tokens allocated to the bucket, base units. */
	allocation: bigint;
	/** Lump sum released at T0, base units. Must be <= allocation. */
	firstUnlock: bigint;
	/** Months from T0 before the remaining allocation starts unlocking. */
	cliffMonths: number;
	/** Months over which the remaining allocation unlocks after the cliff. */
	vestingMonths: number;
	vestingType: VestingType;
	/** Schedule anchor. Usually the project T0, optionally overridden per bucket. */
	t0: Date;
	/** Required when vestingType is 'custom'. Sorted ascending by monthsAfterT0. */
	customCurve?: CurvePoint[];
}
