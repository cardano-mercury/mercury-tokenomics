import type { Movement } from '$lib/tokenomics/compare';
import type { Network } from '$lib/tokenomics/types';
import type { ControlledSet } from '$lib/tokenomics/controlled';

/**
 * Koios chain client. The pure parsing and netting functions are separated from
 * the HTTP calls so they can be unit tested. Utilization is computed as the net
 * external movement of the project token per transaction, which matches the
 * project-level "net external outflow" definition without attempting full UTxO
 * accounting (out of scope for the proof of concept).
 */

const BASE_URL: Record<Network, string> = {
	mainnet: 'https://api.koios.rest/api/v1',
	preprod: 'https://preprod.koios.rest/api/v1',
	preview: 'https://preview.koios.rest/api/v1'
};

/** Subset of a Koios asset entry inside a transaction input or output. */
export interface KoiosAsset {
	policy_id: string;
	asset_name: string | null;
	quantity: string;
}

/** Subset of a Koios transaction input or output. */
export interface KoiosIO {
	payment_addr?: { bech32?: string };
	asset_list?: KoiosAsset[] | null;
}

/** Subset of a Koios tx_info entry. */
export interface KoiosTx {
	tx_hash: string;
	tx_timestamp: number;
	inputs?: KoiosIO[];
	outputs?: KoiosIO[];
}

export interface AssetUnit {
	policyId: string;
	assetNameHex: string;
}

interface NormalizedIO {
	address: string;
	amount: bigint;
}

export interface NormalizedTx {
	txHash: string;
	at: Date;
	inputs: NormalizedIO[];
	outputs: NormalizedIO[];
}

export interface NetMovement {
	txHash: string;
	at: Date;
	direction: 'out' | 'in';
	amount: bigint;
	bucketId: string | null;
	counterparty: string | null;
}

/** Sum the quantity of the target asset across an input or output's asset list. */
function assetAmount(io: KoiosIO, unit: AssetUnit): bigint {
	if (!io.asset_list) return 0n;
	let total = 0n;
	for (const a of io.asset_list) {
		if (a.policy_id === unit.policyId && (a.asset_name ?? '') === unit.assetNameHex) {
			total += BigInt(a.quantity);
		}
	}
	return total;
}

/** Reduce a Koios transaction to the addresses and amounts of the target asset. */
export function normalizeTx(tx: KoiosTx, unit: AssetUnit): NormalizedTx {
	const map = (list: KoiosIO[] | undefined): NormalizedIO[] =>
		(list ?? [])
			.map((io) => ({ address: io.payment_addr?.bech32 ?? '', amount: assetAmount(io, unit) }))
			.filter((io) => io.amount > 0n && io.address);

	return {
		txHash: tx.tx_hash,
		at: new Date(tx.tx_timestamp * 1000),
		inputs: map(tx.inputs),
		outputs: map(tx.outputs)
	};
}

/**
 * Net movement of the asset for the controlled set in one transaction. A
 * negative net (more left controlled inputs than returned to controlled
 * outputs) is an external outflow; a positive net is an inbound. Bucket
 * attribution uses the controlled address contributing the largest amount on
 * the relevant side.
 */
export function netMovementForTx(tx: NormalizedTx, controlled: ControlledSet): NetMovement | null {
	const controlledInputs = tx.inputs.filter((io) => controlled.has(io.address));
	const controlledOutputs = tx.outputs.filter((io) => controlled.has(io.address));
	const sumIn = controlledInputs.reduce((s, io) => s + io.amount, 0n);
	const sumOut = controlledOutputs.reduce((s, io) => s + io.amount, 0n);
	const delta = sumOut - sumIn;

	if (delta === 0n) return null;

	if (delta < 0n) {
		const source = largest(controlledInputs);
		const counterparty = largest(tx.outputs.filter((io) => !controlled.has(io.address)));
		return {
			txHash: tx.txHash,
			at: tx.at,
			direction: 'out',
			amount: -delta,
			bucketId: source ? controlled.bucketOf(source.address) : null,
			counterparty: counterparty?.address ?? null
		};
	}

	const dest = largest(controlledOutputs);
	const counterparty = largest(tx.inputs.filter((io) => !controlled.has(io.address)));
	return {
		txHash: tx.txHash,
		at: tx.at,
		direction: 'in',
		amount: delta,
		bucketId: dest ? controlled.bucketOf(dest.address) : null,
		counterparty: counterparty?.address ?? null
	};
}

function largest(ios: NormalizedIO[]): NormalizedIO | null {
	let best: NormalizedIO | null = null;
	for (const io of ios) {
		if (!best || io.amount > best.amount) best = io;
	}
	return best;
}

/** Net movements across many transactions, in input order. */
export function netMovements(txs: NormalizedTx[], controlled: ControlledSet): NetMovement[] {
	const result: NetMovement[] = [];
	for (const tx of txs) {
		const m = netMovementForTx(tx, controlled);
		if (m) result.push(m);
	}
	return result;
}

/** Convert outbound net movements to comparison-engine Movements. */
export function toEngineMovements(
	movements: NetMovement[],
	unassignedBucketId: string
): Movement[] {
	return movements
		.filter((m) => m.direction === 'out')
		.map((m) => ({ bucketId: m.bucketId ?? unassignedBucketId, at: m.at, amount: m.amount }));
}

async function koiosPost<T>(network: Network, path: string, body: unknown): Promise<T> {
	const res = await fetch(`${BASE_URL[network]}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Koios ${path} responded ${res.status}`);
	return res.json() as Promise<T>;
}

/**
 * Transaction hashes touching the project's wallets.
 *
 * Queried by stake key where possible, not just by the declared addresses. `/address_txs` returns
 * history for the exact strings given, so a transaction that only touched a sibling address (same
 * stake key, rotated payment address) would never be fetched, and the classification fix in
 * `ControlledSet` could not see what it was never given. `/account_txs` is scoped to the stake
 * credential and returns history for every address under it.
 *
 * Addresses with no staking part (enterprise or script addresses) have no stake key to query, so
 * they still go through `/address_txs`. Both sets are merged and deduplicated.
 */
async function fetchTxHashes(
	network: Network,
	addresses: string[],
	stakeKeys: string[]
): Promise<string[]> {
	const hashes = new Set<string>();

	for (const stakeAddress of stakeKeys) {
		const rows = await koiosPost<Array<{ tx_hash: string }>>(network, '/account_txs', {
			_stake_address: stakeAddress
		});
		for (const row of rows) hashes.add(row.tx_hash);
	}

	if (addresses.length > 0) {
		const rows = await koiosPost<Array<{ tx_hash: string }>>(network, '/address_txs', {
			_addresses: addresses
		});
		for (const row of rows) hashes.add(row.tx_hash);
	}

	return [...hashes];
}

/** Fetch full tx info (with inputs and outputs) for a batch of hashes. */
async function fetchTxInfo(network: Network, txHashes: string[]): Promise<KoiosTx[]> {
	const batches: KoiosTx[] = [];
	for (let i = 0; i < txHashes.length; i += 50) {
		const slice = txHashes.slice(i, i + 50);
		const rows = await koiosPost<KoiosTx[]>(network, '/tx_info', {
			_tx_hashes: slice,
			_inputs: true,
			_outputs: true
		});
		batches.push(...rows);
	}
	return batches;
}

export interface SyncResult {
	movements: NetMovement[];
	transactionsScanned: number;
}

/**
 * Fetch and classify the project token's net movements for a set of controlled
 * addresses. Best-effort against the live Koios API; callers should handle
 * thrown network errors.
 */
export async function syncProjectMovements(opts: {
	network: Network;
	unit: AssetUnit;
	controlled: ControlledSet;
}): Promise<SyncResult> {
	const addresses = opts.controlled.addresses();
	if (addresses.length === 0) return { movements: [], transactionsScanned: 0 };

	const hashes = await fetchTxHashes(opts.network, addresses, opts.controlled.stakeKeys());
	const txInfo = await fetchTxInfo(opts.network, hashes);
	const normalized = txInfo.map((tx) => normalizeTx(tx, opts.unit));
	return {
		movements: netMovements(normalized, opts.controlled),
		transactionsScanned: normalized.length
	};
}
