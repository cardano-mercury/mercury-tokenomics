import type { Movement } from './compare';

/**
 * A token transfer observed on chain, before any controlled-set classification.
 * Amounts are bigint base units. Produced by the chain layer; consumed here as
 * plain data so this module stays pure.
 */
export interface RawTransfer {
	txHash: string;
	at: Date;
	/** The address sending the asset. */
	fromAddress: string;
	/** The address receiving the asset. */
	toAddress: string;
	/** Base units transferred, > 0. */
	amount: bigint;
}

export interface ClassifiedTransfers {
	/** Outflows leaving the controlled set, in input order. */
	external: Movement[];
	/** Transfers between controlled wallets (excluded from outflow). */
	internalCount: number;
	/** Transfers into the controlled set from outside (excluded from outflow). */
	inboundCount: number;
}

/**
 * Split raw transfers into external outflows, internal moves, and inbound
 * deposits relative to a project's controlled address set. Pure: all chain
 * access and address resolution happen before this is called.
 *
 * Classification per transfer:
 * - controlled to outside: external outflow, attributed to the from address's
 *   bucket (falling back to `unassignedBucketId` when null or absent).
 * - controlled to controlled: internal, counted only.
 * - outside to controlled: inbound, counted only.
 * - outside to outside: ignored.
 *
 * Transfers with amount <= 0n are ignored entirely.
 */
export function classifyTransfers(
	transfers: RawTransfer[],
	controlled: ReadonlySet<string>,
	addressBucket: ReadonlyMap<string, string | null>,
	unassignedBucketId = 'unassigned'
): ClassifiedTransfers {
	const external: Movement[] = [];
	let internalCount = 0;
	let inboundCount = 0;

	for (const transfer of transfers) {
		if (transfer.amount <= 0n) continue;

		const fromControlled = controlled.has(transfer.fromAddress);
		const toControlled = controlled.has(transfer.toAddress);

		if (fromControlled && !toControlled) {
			const bucket = addressBucket.get(transfer.fromAddress);
			external.push({
				bucketId: bucket ?? unassignedBucketId,
				at: transfer.at,
				amount: transfer.amount
			});
		} else if (fromControlled && toControlled) {
			internalCount += 1;
		} else if (!fromControlled && toControlled) {
			inboundCount += 1;
		}
	}

	return { external, internalCount, inboundCount };
}
