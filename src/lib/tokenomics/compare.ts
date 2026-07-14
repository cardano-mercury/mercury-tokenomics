import type { BucketSchedule } from './types';
import { intendedUnlocked } from './vesting';

/**
 * A single external outflow already attributed to a bucket and classified as
 * leaving the project's controlled set. Produced by the chain layer; consumed
 * here as plain data so this module stays pure.
 */
export interface Movement {
	bucketId: string;
	at: Date;
	/** Tokens that left the controlled set in this movement, base units. */
	amount: bigint;
}

export interface BucketInput {
	id: string;
	name: string;
	schedule: BucketSchedule;
}

export interface SeriesPoint {
	at: Date;
	/** Cumulative intended unlocked at this time, base units. */
	intended: bigint;
	/** Cumulative actual distributed at this time, base units. */
	actual: bigint;
}

export interface Snapshot {
	asOf: Date;
	intended: bigint;
	actual: bigint;
	/** actual minus intended: positive means distributed ahead of schedule. */
	difference: bigint;
}

export interface BucketStatement {
	bucketId: string;
	name: string;
	series: SeriesPoint[];
	snapshot: Snapshot;
}

export interface Statement {
	asOf: Date;
	buckets: BucketStatement[];
	total: { series: SeriesPoint[]; snapshot: Snapshot };
}

export interface BuildStatementOptions {
	/** Time points for the curves, ascending. Should include or precede asOf. */
	points: Date[];
	/** Moment the snapshot is evaluated at. */
	asOf: Date;
}

/**
 * Build the intended-versus-actual statement for a set of buckets and the
 * external outflows attributed to them. Pure: all chain access and tag
 * resolution happen before this is called.
 */
export function buildStatement(
	buckets: BucketInput[],
	movements: Movement[],
	options: BuildStatementOptions
): Statement {
	const points = [...options.points].sort((a, b) => a.getTime() - b.getTime());
	const byBucket = groupMovements(movements);

	const bucketStatements: BucketStatement[] = buckets.map((bucket) => {
		const outflows = byBucket.get(bucket.id) ?? [];
		const series = points.map((at) => ({
			at,
			intended: intendedUnlocked(bucket.schedule, at),
			actual: cumulativeActual(outflows, at)
		}));
		return {
			bucketId: bucket.id,
			name: bucket.name,
			series,
			snapshot: snapshotFor(bucket.schedule, outflows, options.asOf)
		};
	});

	return {
		asOf: options.asOf,
		buckets: bucketStatements,
		total: aggregate(bucketStatements, points, options.asOf)
	};
}

function snapshotFor(schedule: BucketSchedule, outflows: Movement[], asOf: Date): Snapshot {
	const intended = intendedUnlocked(schedule, asOf);
	const actual = cumulativeActual(outflows, asOf);
	return { asOf, intended, actual, difference: actual - intended };
}

/** Sum of outflow amounts at or before `at`. */
function cumulativeActual(outflows: Movement[], at: Date): bigint {
	let sum = 0n;
	for (const m of outflows) {
		if (m.at.getTime() <= at.getTime()) sum += m.amount;
	}
	return sum;
}

function groupMovements(movements: Movement[]): Map<string, Movement[]> {
	const map = new Map<string, Movement[]>();
	for (const m of movements) {
		const list = map.get(m.bucketId);
		if (list) list.push(m);
		else map.set(m.bucketId, [m]);
	}
	return map;
}

/** Sum the per-bucket statements into a project-wide series and snapshot. */
function aggregate(
	bucketStatements: BucketStatement[],
	points: Date[],
	asOf: Date
): { series: SeriesPoint[]; snapshot: Snapshot } {
	const series = points.map((at, i) => {
		let intended = 0n;
		let actual = 0n;
		for (const bs of bucketStatements) {
			intended += bs.series[i].intended;
			actual += bs.series[i].actual;
		}
		return { at, intended, actual };
	});

	let intended = 0n;
	let actual = 0n;
	for (const bs of bucketStatements) {
		intended += bs.snapshot.intended;
		actual += bs.snapshot.actual;
	}

	return { series, snapshot: { asOf, intended, actual, difference: actual - intended } };
}
