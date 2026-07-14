import { describe, it, expect } from 'vitest';
import { classifyTransfers, type RawTransfer } from './classify';
import { makeControlledSet, type ResolveStakeKey } from './controlled';

const at = (iso: string) => new Date(iso);

/** No address has a staking part, so membership falls back to exact matching. */
const noStake: ResolveStakeKey = () => null;

function setOf(wallets: Array<[address: string, bucketId: string | null]>, resolve = noStake) {
	return makeControlledSet(
		wallets.map(([address, bucketId]) => ({ address, bucketId })),
		resolve
	);
}

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
		const controlled = setOf([['ctrl', 'team']]);
		const t = transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: 250n });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([{ bucketId: 'team', at: t.at, amount: 250n }]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(0);
	});

	it('falls back to the default unassigned bucket when the wallet has no bucket', () => {
		const controlled = setOf([['ctrl', null]]);
		const t = transfer({ fromAddress: 'ctrl', toAddress: 'outside' });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([{ bucketId: 'unassigned', at: t.at, amount: 100n }]);
	});

	it('uses a custom unassigned bucket id', () => {
		const controlled = setOf([['ctrl', null]]);
		const t = transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: 1n });

		const result = classifyTransfers([t], controlled, 'TREASURY_UNKNOWN');

		expect(result.external).toEqual([{ bucketId: 'TREASURY_UNKNOWN', at: t.at, amount: 1n }]);
	});

	it('excludes controlled to controlled transfers and counts them as internal', () => {
		const controlled = setOf([
			['a', 'team'],
			['b', null]
		]);
		const t = transfer({ fromAddress: 'a', toAddress: 'b' });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(1);
		expect(result.inboundCount).toBe(0);
	});

	it('excludes outside to controlled transfers and counts them as inbound', () => {
		const controlled = setOf([['ctrl', null]]);
		const t = transfer({ fromAddress: 'outside', toAddress: 'ctrl' });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(1);
	});

	it('ignores transfers between two outside addresses entirely', () => {
		const controlled = setOf([['ctrl', null]]);
		const t = transfer({ fromAddress: 'x', toAddress: 'y' });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(0);
	});

	it('ignores transfers with amount <= 0n in every category', () => {
		const controlled = setOf([
			['ctrl', 'team'],
			['ctrl2', null]
		]);
		const transfers = [
			transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: 0n }),
			transfer({ fromAddress: 'ctrl', toAddress: 'outside', amount: -5n }),
			transfer({ fromAddress: 'ctrl', toAddress: 'ctrl2', amount: 0n }),
			transfer({ fromAddress: 'outside', toAddress: 'ctrl', amount: -1n })
		];

		const result = classifyTransfers(transfers, controlled);

		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(0);
		expect(result.inboundCount).toBe(0);
	});

	it('preserves input order in external and computes counts for a mixed list', () => {
		const controlled = setOf([
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

		const result = classifyTransfers(transfers, controlled);

		expect(result.external).toEqual([
			{ bucketId: 'team', at: at('2024-01-01'), amount: 10n },
			{ bucketId: 'unassigned', at: at('2024-02-01'), amount: 40n },
			{ bucketId: 'team', at: at('2024-03-01'), amount: 60n }
		]);
		expect(result.internalCount).toBe(1);
		expect(result.inboundCount).toBe(1);
	});
});

describe('classifyTransfers with rotated addresses', () => {
	// `rotated` is an undeclared sibling of the declared `team1`: same stake key, different payment
	// address, which is what a wallet produces on its own as it rotates change addresses.
	const stakeOf: ResolveStakeKey = (address) =>
		({ team1: 'stake_team', rotated: 'stake_team', pub1: 'stake_pub' })[address] ?? null;

	it('does not count a move to a rotated sibling as an outflow', () => {
		const controlled = setOf([['team1', 'team']], stakeOf);
		const t = transfer({ fromAddress: 'team1', toAddress: 'rotated', amount: 500n });

		const result = classifyTransfers([t], controlled);

		// Matching on the literal address alone would have booked this as 500 delivered.
		expect(result.external).toEqual([]);
		expect(result.internalCount).toBe(1);
	});

	it('attributes an outflow FROM a rotated sibling to its bucket', () => {
		const controlled = setOf([['team1', 'team']], stakeOf);
		const t = transfer({ fromAddress: 'rotated', toAddress: 'outside', amount: 70n });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([{ bucketId: 'team', at: t.at, amount: 70n }]);
	});

	it('counts a deposit to a rotated sibling as inbound, not as an outside transfer', () => {
		const controlled = setOf([['team1', 'team']], stakeOf);
		const t = transfer({ fromAddress: 'outside', toAddress: 'rotated' });

		const result = classifyTransfers([t], controlled);

		expect(result.inboundCount).toBe(1);
		expect(result.external).toEqual([]);
	});

	it('leaves a sibling unattributed when its stake key spans several buckets', () => {
		// One wallet, one stake key, a different payment address per bucket: legitimate, and it means
		// the stake key cannot say which bucket an undeclared sibling belongs to. Guessing would
		// clump the buckets together, so the outflow is booked as unassigned instead.
		// Only the project's own addresses carry the shared key; `outside` is a stranger.
		const shared: ResolveStakeKey = (a) =>
			['founders1', 'public1', 'siblingOfBoth'].includes(a) ? 'stake_shared' : null;
		const controlled = setOf(
			[
				['founders1', 'founders'],
				['public1', 'public']
			],
			shared
		);
		const t = transfer({ fromAddress: 'siblingOfBoth', toAddress: 'outside', amount: 9n });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([{ bucketId: 'unassigned', at: t.at, amount: 9n }]);
	});

	it('still attributes declared addresses exactly, even when they share a stake key', () => {
		const shared: ResolveStakeKey = (a) =>
			['founders1', 'public1'].includes(a) ? 'stake_shared' : null;
		const controlled = setOf(
			[
				['founders1', 'founders'],
				['public1', 'public']
			],
			shared
		);
		const transfers = [
			transfer({ fromAddress: 'founders1', toAddress: 'outside', amount: 1n }),
			transfer({ fromAddress: 'public1', toAddress: 'outside', amount: 2n })
		];

		const result = classifyTransfers(transfers, controlled);

		expect(result.external).toEqual([
			{ bucketId: 'founders', at: transfers[0].at, amount: 1n },
			{ bucketId: 'public', at: transfers[1].at, amount: 2n }
		]);
	});

	it('keeps unrelated stake keys outside the set', () => {
		const controlled = setOf([['team1', 'team']], stakeOf);
		const t = transfer({ fromAddress: 'team1', toAddress: 'pub1', amount: 5n });

		const result = classifyTransfers([t], controlled);

		expect(result.external).toEqual([{ bucketId: 'team', at: t.at, amount: 5n }]);
		expect(result.internalCount).toBe(0);
	});
});
