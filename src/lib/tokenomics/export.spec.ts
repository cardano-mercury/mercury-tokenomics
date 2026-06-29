import { describe, it, expect } from 'vitest';
import { statementRows, statementTotalRow } from './export';
import { assembleStatement, type BucketRow } from './statement';
import { MONTH_MS } from './time';

const T0 = new Date('2025-01-01T00:00:00Z');
const at = (m: number) => new Date(T0.getTime() + m * MONTH_MS);

const buckets: BucketRow[] = [
	{
		id: 'team',
		name: 'Team',
		allocation: '1000000000',
		firstUnlock: '0',
		cliffMonths: 0,
		vestingMonths: 10,
		vestingType: 'linear'
	}
];

const statement = assembleStatement(
	{ t0: T0 },
	buckets,
	[{ bucketId: 'team', amount: '250000000', occurredAt: at(2), direction: 'out' }],
	{ asOf: at(5), points: [at(5)] }
);

describe('statementRows', () => {
	it('scales amounts to whole tokens and computes delivered percent', () => {
		const rows = statementRows(statement, 6);
		expect(rows[0]).toEqual({ name: 'Team', promised: 500, delivered: 250, deliveredPct: 50 });
	});

	it('reports zero percent when nothing is promised', () => {
		const empty = assembleStatement({ t0: T0 }, [{ ...buckets[0], allocation: '0' }], [], {
			asOf: at(5),
			points: [at(5)]
		});
		expect(statementRows(empty, 6)[0].deliveredPct).toBe(0);
	});
});

describe('statementTotalRow', () => {
	it('summarizes the project total', () => {
		const total = statementTotalRow(statement, 6);
		expect(total.name).toBe('Total');
		expect(total.promised).toBe(500);
		expect(total.delivered).toBe(250);
	});
});
