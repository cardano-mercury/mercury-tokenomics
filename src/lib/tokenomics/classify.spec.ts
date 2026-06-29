import { describe, it, expect } from 'vitest';
import { classifyTransfers, type RawTransfer } from './classify';

const at = (iso: string) => new Date(iso);

function transfer(overrides: Partial<RawTransfer> = {}): RawTransfer {
	return {
		txHash: 'tx',
		at: at('2024-01-01T00:00:00Z'),
		fromAddress: 'a',
		toAddress: 'b',
		amount: 100n,
		...overrides
	};
}

describe('classifyTransfers', () => {
	it('emits an external outflow with the from address bucket', () => {
		const controlled = new Set(['ctrl']);
		const addressBucket = new Map<string, string | null>([['ctrl', 'team']]);
		const t = transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: 250n });

		const result = classifyTransfers([t], controlled, addressBucket);

		expect(result.external).toEqual([{ bucketId: 'team', at: t.at, amount: 250n }]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(0);
	});

	it('falls back to the default unassigned bucket when the bucket is null', () => {
		const controlled = new Set(['ctrl']);
		const addressBucket = new Map<string, string | null>([['ctrl', null]]);
		const t = transfer({ fromAddress: 'ctrl', toAddress: 'outside' });

		const result = classifyTransfers([t], controlled, addressBucket);

		expect(result.external).toEqual([{ bucketId: 'unassigned', at: t.at, amount: 100n }]);
	});

	it('falls back to the default unassigned bucket when the address is absent from the map', () => {
		const controlled = new Set(['ctrl']);
		const addressBucket = new Map<string, string | null>();
		const t = transfer({ fromAddress: 'ctrl', toAddress: 'outside' });

		const result = classifyTransfers([t], controlled, addressBucket);

		expect(result.external).toEqual([{ bucketId: 'unassigned', at: t.at, amount: 100n }]);
	});

	it('uses a custom unassigned bucket id for null and absent buckets', () => {
		const controlled = new Set(['ctrlNull', 'ctrlAbsent']);
		const addressBucket = new Map<string, string | null>([['ctrlNull', null]]);
		const tNull = transfer({ fromAddress: 'ctrlNull', toAddress: 'outside', amount: 1n });
		const tAbsent = transfer({ fromAddress: 'ctrlAbsent', toAddress: 'outside', amount: 2n });

		const result = classifyTransfers(
			[tNull, tAbsent],
			controlled,
			addressBucket,
			'TREASURY_UNKNOWN'
		);

		expect(result.external).toEqual([
			{ bucketId: 'TREASURY_UNKNOWN', at: tNull.at, amount: 1n },
			{ bucketId: 'TREASURY_UNKNOWN', at: tAbsent.at, amount: 2n }
		]);
	});

	it('excludes controlled to controlled transfers and counts them as internal', () => {
		const controlled = new Set(['a', 'b']);
		const addressBucket = new Map<string, string | null>([['a', 'team']]);
		const t = transfer({ fromAddress: 'a', toAddress: 'b' });

		const result = classifyTransfers([t], controlled, addressBucket);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(1);
		expect(result.inboundCount).toBe(0);
	});

	it('excludes outside to controlled transfers and counts them as inbound', () => {
		const controlled = new Set(['ctrl']);
		const addressBucket = new Map<string, string | null>();
		const t = transfer({ fromAddress: 'outside', toAddress: 'ctrl' });

		const result = classifyTransfers([t], controlled, addressBucket);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(1);
	});

	it('ignores transfers between two outside addresses entirely', () => {
		const controlled = new Set(['ctrl']);
		const addressBucket = new Map<string, string | null>();
		const t = transfer({ fromAddress: 'x', toAddress: 'y' });

		const result = classifyTransfers([t], controlled, addressBucket);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(0);
	});

	it('ignores transfers with amount <= 0n in every category', () => {
		const controlled = new Set(['ctrl', 'ctrl2']);
		const addressBucket = new Map<string, string | null>([['ctrl', 'team']]);
		const zeroOutflow = transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: 0n });
		const negativeOutflow = transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: -5n });
		const zeroInternal = transfer({ fromAddress: 'ctrl', toAddress: 'ctrl2', amount: 0n });
		const zeroInbound = transfer({ fromAddress: 'outside', toAddress: 'ctrl', amount: -1n });

		const result = classifyTransfers(
			[zeroOutflow, negativeOutflow, zeroInternal, zeroInbound],
			controlled,
			addressBucket
		);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(0);
	});

	it('preserves input order in external and computes counts for a mixed list', () => {
		const controlled = new Set(['ctrlA', 'ctrlB']);
		const addressBucket = new Map<string, string | null>([
			['ctrlA', 'team'],
			['ctrlB', null]
		]);

		const transfers: RawTransfer[] = [
			transfer({ fromAddress: 'ctrlA', toAddress: 'out1', amount: 10n, at: at('2024-01-01') }),
			transfer({ fromAddress: 'ctrlA', toAddress: 'ctrlB', amount: 20n }),
			transfer({ fromAddress: 'outX', toAddress: 'ctrlA', amount: 30n }),
			transfer({ fromAddress: 'ctrlB', toAddress: 'out2', amount: 40n, at: at('2024-02-01') }),
			transfer({ fromAddress: 'outX', toAddress: 'outY', amount: 50n }),
			transfer({ fromAddress: 'ctrlA', toAddress: 'out3', amount: 0n }),
			transfer({ fromAddress: 'ctrlA', toAddress: 'out4', amount: 60n, at: at('2024-03-01') })
		];

		const result = classifyTransfers(transfers, controlled, addressBucket);

		expect(result.external).toEqual([
			{ bucketId: 'team', at: at('2024-01-01'), amount: 10n },
			{ bucketId: 'unassigned', at: at('2024-02-01'), amount: 40n },
			{ bucketId: 'team', at: at('2024-03-01'), amount: 60n }
		]);
		expect(result.internalCount).toBe(1);
		expect(result.inboundCount).toBe(1);
	});
});
