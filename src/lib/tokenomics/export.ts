import type { Statement } from './compare';

/**
 * Flattens a statement snapshot into display rows for export. Amounts are scaled
 * to whole tokens for the spreadsheet; the engine stays in base units.
 */

export interface StatementRow {
	name: string;
	promised: number;
	delivered: number;
	deliveredPct: number;
}

function scale(base: bigint, decimals: number): number {
	return decimals === 0 ? Number(base) : Number(base) / 10 ** decimals;
}

export function statementRows(statement: Statement, decimals: number): StatementRow[] {
	return statement.buckets.map((b) => {
		const promised = scale(b.snapshot.intended, decimals);
		const delivered = scale(b.snapshot.actual, decimals);
		return {
			name: b.name,
			promised,
			delivered,
			deliveredPct: promised > 0 ? (delivered / promised) * 100 : 0
		};
	});
}

export function statementTotalRow(statement: Statement, decimals: number): StatementRow {
	const promised = scale(statement.total.snapshot.intended, decimals);
	const delivered = scale(statement.total.snapshot.actual, decimals);
	return {
		name: 'Total',
		promised,
		delivered,
		deliveredPct: promised > 0 ? (delivered / promised) * 100 : 0
	};
}
