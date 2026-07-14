/**
 * The controlled-address set: the classification boundary for a project.
 *
 * A wallet is not one address. Cardano wallets rotate payment addresses freely while keeping the
 * same staking credential, so a project that declares `addr1...abc` will still spend from and
 * receive to sibling addresses that share its stake key. Matching on the literal string alone counts
 * those siblings as outsiders, which turns an internal move into an external outflow and overstates
 * utilization for any project whose wallets are not single-address-for-life.
 *
 * Membership and bucket attribution are deliberately answered differently:
 *
 * - **Membership** ("is this address ours?") uses the stake key. An address is controlled when it is
 *   a declared address, or when it shares a declared address's stake key.
 * - **Attribution** ("whose bucket does this outflow belong to?") does NOT fall back to the stake key
 *   unless that key is unambiguous. Several buckets may legitimately sit behind one stake key (one
 *   wallet, a different payment address per bucket), so attributing a sibling address by stake key
 *   would clump every one of those buckets together. Where a stake key spans more than one bucket,
 *   an address that is not declared verbatim is left unattributed rather than guessed at.
 *
 * Stake-key resolution is injected rather than imported, so this module stays pure and testable
 * without pulling the Cardano serialization library into the domain layer. The server passes
 * `rewardAddressOf` from `@cardano-mercury/core/cardano`.
 */

export interface ControlledWalletRef {
	address: string;
	/** The bucket this wallet's outflows are attributed to, if it is assigned to one. */
	bucketId: string | null;
}

export interface ControlledSet {
	/** Whether the address belongs to the project, by exact match or by shared stake key. */
	has(address: string): boolean;
	/**
	 * The bucket an address's outflows belong to. Declared addresses use their own bucket. An
	 * undeclared sibling (matched only by stake key) resolves to a bucket only when that stake key
	 * has exactly one bucket behind it; otherwise null, because the project has told us the key
	 * spans several buckets and there is no honest way to pick one.
	 */
	bucketOf(address: string): string | null;
	/** The declared addresses, for the chain layer to query history against. */
	addresses(): string[];
	/** The distinct stake keys behind the declared addresses, with no nulls. */
	stakeKeys(): string[];
}

/** Resolves a payment address to its bech32 reward (stake) address, or null if it has none. */
export type ResolveStakeKey = (address: string) => string | null;

export function makeControlledSet(
	wallets: readonly ControlledWalletRef[],
	resolveStakeKey: ResolveStakeKey
): ControlledSet {
	const bucketByAddress = new Map<string, string | null>();
	// Every distinct bucket seen behind each stake key. More than one means the key cannot attribute.
	const bucketsByStakeKey = new Map<string, Set<string | null>>();

	for (const wallet of wallets) {
		bucketByAddress.set(wallet.address, wallet.bucketId);

		const stakeKey = resolveStakeKey(wallet.address);
		if (stakeKey === null) continue;

		let buckets = bucketsByStakeKey.get(stakeKey);
		if (!buckets) {
			buckets = new Set();
			bucketsByStakeKey.set(stakeKey, buckets);
		}
		buckets.add(wallet.bucketId);
	}

	// Resolution is pure and repeated across every input and output of every transaction, so results
	// are memoised per set.
	const resolved = new Map<string, string | null>();
	const stakeKeyOf = (address: string): string | null => {
		let key = resolved.get(address);
		if (key === undefined) {
			key = resolveStakeKey(address);
			resolved.set(address, key);
		}
		return key;
	};

	return {
		has(address) {
			if (bucketByAddress.has(address)) return true;

			const stakeKey = stakeKeyOf(address);
			return stakeKey !== null && bucketsByStakeKey.has(stakeKey);
		},

		bucketOf(address) {
			const exact = bucketByAddress.get(address);
			if (exact !== undefined) return exact;

			const stakeKey = stakeKeyOf(address);
			if (stakeKey === null) return null;

			const buckets = bucketsByStakeKey.get(stakeKey);
			if (!buckets || buckets.size !== 1) return null;

			return [...buckets][0];
		},

		addresses() {
			return [...bucketByAddress.keys()];
		},

		stakeKeys() {
			return [...bucketsByStakeKey.keys()];
		}
	};
}
