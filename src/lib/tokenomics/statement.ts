import { buildStatement, type BucketInput, type Movement, type Statement } from './compare';
import { MONTH_MS } from './time';
import type { VestingType, CurvePoint } from './types';

/**
 * Assembles a Promised versus Delivered statement from stored project data.
 * Pure: it maps database-shaped rows onto the comparison engine inputs. Outflows
 * whose bucket is missing or unknown are gathered under a synthetic Unassigned
 * bucket so the project totals still account for them.
 */

export const UNASSIGNED_BUCKET_ID = 'unassigned';

export interface ProjectLike {
	t0: Date;
}

export interface BucketRow {
	id: string;
	name: string;
	allocation: string;
	firstUnlock: string;
	cliffMonths: number;
	vestingMonths: number;
	vestingType: VestingType;
	t0Override?: Date | null;
	customCurve?: string | null;
}

export interface MovementRow {
	bucketId: string | null;
	amount: string;
	occurredAt: Date;
	direction: 'out' | 'in';
}

export interface AssembleOptions {
	asOf: Date;
	points?: Date[];
}

/** Evenly spaced time points from `from` through `to`, capped at maxPoints. */
export function monthlyPoints(from: Date, to: Date, maxPoints = 60): Date[] {
	if (to.getTime() <= from.getTime()) return [to];
	const totalMonths = Math.ceil((to.getTime() - from.getTime()) / MONTH_MS);
	const step = Math.max(1, Math.ceil(totalMonths / maxPoints));
	const points: Date[] = [];
	for (let m = 0; m <= totalMonths; m += step) {
		points.push(new Date(from.getTime() + m * MONTH_MS));
	}
	if (points[points.length - 1].getTime() < to.getTime()) points.push(to);
	return points;
}

export function assembleStatement(
	project: ProjectLike,
	buckets: BucketRow[],
	movements: MovementRow[],
	options: AssembleOptions
): Statement {
	const known = new Set(buckets.map((b) => b.id));

	const outflows: Movement[] = movements
		.filter((m) => m.direction === 'out')
		.map((m) => ({
			bucketId: m.bucketId && known.has(m.bucketId) ? m.bucketId : UNASSIGNED_BUCKET_ID,
			at: m.occurredAt,
			amount: BigInt(m.amount)
		}));

	const bucketInputs: BucketInput[] = buckets.map((b) => ({
		id: b.id,
		name: b.name,
		schedule: {
			allocation: BigInt(b.allocation),
			firstUnlock: BigInt(b.firstUnlock),
			cliffMonths: b.cliffMonths,
			vestingMonths: b.vestingMonths,
			vestingType: b.vestingType,
			t0: b.t0Override ?? project.t0,
			customCurve: parseCurve(b.customCurve)
		}
	}));

	if (outflows.some((m) => m.bucketId === UNASSIGNED_BUCKET_ID)) {
		bucketInputs.push({
			id: UNASSIGNED_BUCKET_ID,
			name: 'Unassigned',
			schedule: {
				allocation: 0n,
				firstUnlock: 0n,
				cliffMonths: 0,
				vestingMonths: 0,
				vestingType: 'linear',
				t0: project.t0
			}
		});
	}

	const points = options.points ?? monthlyPoints(project.t0, options.asOf);
	return buildStatement(bucketInputs, outflows, { points, asOf: options.asOf });
}

function parseCurve(raw: string | null | undefined): CurvePoint[] | undefined {
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as CurvePoint[]) : undefined;
	} catch {
		return undefined;
	}
}
