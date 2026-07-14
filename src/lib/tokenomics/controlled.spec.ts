import { describe, it, expect, vi } from 'vitest';
import { makeControlledSet, type ResolveStakeKey } from './controlled';

const noStake: ResolveStakeKey = () => null;

describe('makeControlledSet membership', () => {
	it('matches a declared address exactly', () => {
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], noStake);

		expect(set.has('a')).toBe(true);
		expect(set.has('b')).toBe(false);
	});

	it('matches an undeclared address that shares a declared stake key', () => {
		const stakeOf: ResolveStakeKey = (a) => (a === 'a' || a === 'a-rotated' ? 'stake1' : null);
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], stakeOf);

		expect(set.has('a-rotated')).toBe(true);
	});

	it('does not match an address with a different stake key', () => {
		const stakeOf: ResolveStakeKey = (a) => (a === 'a' ? 'stake1' : 'stake2');
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], stakeOf);

		expect(set.has('someone-else')).toBe(false);
	});

	it('does not treat two stakeless addresses as related', () => {
		// Enterprise and script addresses have no staking part. Two nulls are not a match.
		const set = makeControlledSet([{ address: 'enterprise', bucketId: 'team' }], noStake);

		expect(set.has('other-enterprise')).toBe(false);
	});

	it('is empty when no wallets are declared', () => {
		const set = makeControlledSet([], noStake);

		expect(set.has('anything')).toBe(false);
		expect(set.addresses()).toEqual([]);
		expect(set.stakeKeys()).toEqual([]);
	});
});

describe('makeControlledSet attribution', () => {
	it('attributes a declared address to its own bucket', () => {
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], noStake);

		expect(set.bucketOf('a')).toBe('team');
	});

	it('returns null for a declared wallet with no bucket', () => {
		const set = makeControlledSet([{ address: 'a', bucketId: null }], noStake);

		expect(set.bucketOf('a')).toBeNull();
	});

	it('attributes a sibling when its stake key has exactly one bucket behind it', () => {
		const stakeOf: ResolveStakeKey = () => 'stake1';
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], stakeOf);

		expect(set.bucketOf('a-rotated')).toBe('team');
	});

	it('refuses to attribute a sibling when the stake key spans several buckets', () => {
		// Buckets may legitimately share one stake key (one wallet, a payment address per bucket).
		// Picking one would clump them together, so an undeclared sibling stays unattributed.
		const stakeOf: ResolveStakeKey = () => 'shared';
		const set = makeControlledSet(
			[
				{ address: 'founders1', bucketId: 'founders' },
				{ address: 'public1', bucketId: 'public' }
			],
			stakeOf
		);

		expect(set.has('sibling')).toBe(true);
		expect(set.bucketOf('sibling')).toBeNull();
	});

	it('still attributes the declared addresses exactly when they share a stake key', () => {
		const stakeOf: ResolveStakeKey = () => 'shared';
		const set = makeControlledSet(
			[
				{ address: 'founders1', bucketId: 'founders' },
				{ address: 'public1', bucketId: 'public' }
			],
			stakeOf
		);

		expect(set.bucketOf('founders1')).toBe('founders');
		expect(set.bucketOf('public1')).toBe('public');
	});

	it('treats an unassigned wallet as a distinct bucket for ambiguity', () => {
		// One wallet in a bucket and one unassigned, behind the same key: still ambiguous.
		const stakeOf: ResolveStakeKey = () => 'shared';
		const set = makeControlledSet(
			[
				{ address: 'a', bucketId: 'team' },
				{ address: 'b', bucketId: null }
			],
			stakeOf
		);

		expect(set.bucketOf('sibling')).toBeNull();
	});

	it('attributes a sibling when several declared wallets agree on the same bucket', () => {
		const stakeOf: ResolveStakeKey = () => 'shared';
		const set = makeControlledSet(
			[
				{ address: 'a', bucketId: 'team' },
				{ address: 'b', bucketId: 'team' }
			],
			stakeOf
		);

		expect(set.bucketOf('sibling')).toBe('team');
	});

	it('returns null for an address that is not ours at all', () => {
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], noStake);

		expect(set.bucketOf('stranger')).toBeNull();
	});
});

describe('makeControlledSet inputs to the chain layer', () => {
	it('exposes the declared addresses and the distinct stake keys', () => {
		const stakeOf: ResolveStakeKey = (a) => (a === 'enterprise' ? null : 'stake1');
		const set = makeControlledSet(
			[
				{ address: 'a', bucketId: 'team' },
				{ address: 'b', bucketId: 'public' },
				{ address: 'enterprise', bucketId: null }
			],
			stakeOf
		);

		expect(set.addresses()).toEqual(['a', 'b', 'enterprise']);
		// Deduplicated, and stakeless addresses contribute nothing.
		expect(set.stakeKeys()).toEqual(['stake1']);
	});

	it('memoises stake-key resolution, which runs against every input and output', () => {
		const resolve = vi.fn<ResolveStakeKey>(() => 'stake1');
		const set = makeControlledSet([{ address: 'a', bucketId: 'team' }], resolve);
		resolve.mockClear();

		set.has('sibling');
		set.has('sibling');
		set.bucketOf('sibling');

		expect(resolve).toHaveBeenCalledTimes(1);
	});
});
