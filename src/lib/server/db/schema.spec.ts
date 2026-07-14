import { describe, it, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
	project,
	bucket,
	controlledWallet,
	transactionTag,
	anchorRecord,
	tokenMovement
} from './schema';

/**
 * Postgres truncates identifiers at 63 characters, silently. Drizzle derives a foreign key name as
 * `{table}_{column}_{reftable}_{refcolumn}_fk`, which with the `tokenomics_` prefix exceeded that:
 * the server stored a truncated name, drizzle kept expecting the full one, and every schema diff
 * proposed recreating a constraint that already existed. These tests pin the naming so the drift
 * cannot come back.
 */

const PG_IDENTIFIER_LIMIT = 63;

const tables = [
	{ name: 'project', table: project },
	{ name: 'bucket', table: bucket },
	{ name: 'controlledWallet', table: controlledWallet },
	{ name: 'transactionTag', table: transactionTag },
	{ name: 'anchorRecord', table: anchorRecord },
	{ name: 'tokenMovement', table: tokenMovement }
];

describe('schema identifiers', () => {
	it.each(tables)('$name names every foreign key explicitly', ({ table }) => {
		const { foreignKeys } = getTableConfig(table);

		for (const fk of foreignKeys) {
			// An unnamed foreign key falls back to drizzle's derived name, which is what overflowed.
			expect(fk.getName()).toBeTruthy();
		}
	});

	it.each(tables)('$name keeps foreign key names inside the Postgres limit', ({ table }) => {
		const { foreignKeys } = getTableConfig(table);

		for (const fk of foreignKeys) {
			expect(fk.getName().length).toBeLessThan(PG_IDENTIFIER_LIMIT);
		}
	});

	it.each(tables)('$name keeps index names inside the Postgres limit', ({ table }) => {
		const { indexes } = getTableConfig(table);

		for (const idx of indexes) {
			expect(idx.config.name!.length).toBeLessThan(PG_IDENTIFIER_LIMIT);
		}
	});

	it('has no duplicate constraint names across tables', () => {
		const names = tables.flatMap(({ table }) =>
			getTableConfig(table).foreignKeys.map((fk) => fk.getName())
		);

		expect(new Set(names).size).toBe(names.length);
	});

	it('covers every table that foreign-keys to another', () => {
		const total = tables.reduce(
			(sum, { table }) => sum + getTableConfig(table).foreignKeys.length,
			0
		);

		// project->user, bucket->project, wallet->{project,bucket}, tag->{project,bucket},
		// anchor->project, movement->{project,bucket}.
		expect(total).toBe(9);
	});
});
