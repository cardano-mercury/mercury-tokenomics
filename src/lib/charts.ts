import type { Statement } from '$lib/tokenomics/compare';

/**
 * Converts a Statement (bigint base units) into chart-ready numbers. Amounts are
 * scaled to whole-token floats only for display; the underlying engine stays in
 * integer base units. Colors are assigned per bucket from a fixed palette.
 */

export const BUCKET_PALETTE = [
	'#7c6cff',
	'#ff8a80',
	'#34c7e3',
	'#1ed980',
	'#f5a623',
	'#b388ff',
	'#4dd0e1',
	'#ff7043',
	'#9ccc65',
	'#ec407a'
];

export function colorForIndex(index: number): string {
	return BUCKET_PALETTE[index % BUCKET_PALETTE.length];
}

/** Scale integer base units to a whole-token number for display. */
export function scaleToNumber(base: bigint, decimals: number): number {
	if (decimals === 0) return Number(base);
	return Number(base) / 10 ** decimals;
}

export interface ChartBucket {
	id: string;
	name: string;
	color: string;
	promised: number[];
	delivered: number[];
}

export interface ChartData {
	pointsIso: string[];
	buckets: ChartBucket[];
	totalPromised: number[];
	totalDelivered: number[];
}

export function buildChartData(statement: Statement, decimals: number): ChartData {
	return {
		pointsIso: statement.total.series.map((p) => p.at.toISOString()),
		buckets: statement.buckets.map((b, i) => ({
			id: b.bucketId,
			name: b.name,
			color: colorForIndex(i),
			promised: b.series.map((p) => scaleToNumber(p.intended, decimals)),
			delivered: b.series.map((p) => scaleToNumber(p.actual, decimals))
		})),
		totalPromised: statement.total.series.map((p) => scaleToNumber(p.intended, decimals)),
		totalDelivered: statement.total.series.map((p) => scaleToNumber(p.actual, decimals))
	};
}
