import { describe, it, expect } from 'vitest';
import { makeControlledSet } from '$lib/tokenomics/controlled';
import {
	normalizeTx,
	netMovementForTx,
	netMovements,
	toEngineMovements,
	type KoiosTx,
	type NormalizedTx
} from './koios';

const UNIT = { policyId: 'a'.repeat(56), assetNameHex: '41434d45' };

describe('normalizeTx', () => {
	it('extracts the target asset amount per address and drops zero or empty entries', () => {
		const tx: KoiosTx = {
			tx_hash: 'tx1',
			tx_timestamp: 1735689600, // 2025-01-01T00:00:00Z
			inputs: [
				{
					payment_addr: { bech32: 'addrA' },
					asset_list: [
						{ policy_id: UNIT.policyId, asset_name: UNIT.assetNameHex, quantity: '100' },
						{ policy_id: 'other', asset_name: 'ff', quantity: '999' }
					]
				},
				{ payment_addr: { bech32: 'addrNoAsset' }, asset_list: [] }
			],
			outputs: [
				{
					payment_addr: { bech32: 'addrB' },
					asset_list: [{ policy_id: UNIT.policyId, asset_name: UNIT.assetNameHex, quantity: '100' }]
				}
			]
		};
		const n = normalizeTx(tx, UNIT);
		expect(n.txHash).toBe('tx1');
		expect(n.at.toISOString()).toBe('2025-01-01T00:00:00.000Z');
		expect(n.inputs).toEqual([{ address: 'addrA', amount: 100n }]);
		expect(n.outputs).toEqual([{ address: 'addrB', amount: 100n }]);
	});

	it('sums multiple matching asset entries and matches empty asset name', () => {
		const tx: KoiosTx = {
			tx_hash: 'tx2',
			tx_timestamp: 1735689600,
			inputs: [
				{
					payment_addr: { bech32: 'addrA' },
					asset_list: [
						{ policy_id: UNIT.policyId, asset_name: null, quantity: '10' },
						{ policy_id: UNIT.policyId, asset_name: null, quantity: '5' }
					]
				}
			],
			outputs: []
		};
		const n = normalizeTx(tx, { policyId: UNIT.policyId, assetNameHex: '' });
		expect(n.inputs).toEqual([{ address: 'addrA', amount: 15n }]);
	});
});

const controlled = makeControlledSet(
	[
		{ address: 'ctrlA', bucketId: 'bucket-a' },
		{ address: 'ctrlB', bucketId: null }
	],
	() => null
);

function tx(inputs: [string, bigint][], outputs: [string, bigint][]): NormalizedTx {
	return {
		txHash: 'tx',
		at: new Date('2025-02-01T00:00:00Z'),
		inputs: inputs.map(([address, amount]) => ({ address, amount })),
		outputs: outputs.map(([address, amount]) => ({ address, amount }))
	};
}

describe('netMovementForTx', () => {
	it('reports a full external outflow attributed to the input bucket', () => {
		const m = netMovementForTx(tx([['ctrlA', 100n]], [['ext', 100n]]), controlled);
		expect(m).toMatchObject({
			direction: 'out',
			amount: 100n,
			bucketId: 'bucket-a',
			counterparty: 'ext'
		});
	});

	it('nets internal change against external outflow', () => {
		const m = netMovementForTx(
			tx(
				[['ctrlA', 100n]],
				[
					['ctrlB', 30n],
					['ext', 70n]
				]
			),
			controlled
		);
		expect(m).toMatchObject({ direction: 'out', amount: 70n });
	});

	it('returns null for a purely internal transaction', () => {
		expect(netMovementForTx(tx([['ctrlA', 100n]], [['ctrlB', 100n]]), controlled)).toBeNull();
	});

	it('reports an inbound movement', () => {
		const m = netMovementForTx(tx([['ext', 50n]], [['ctrlA', 50n]]), controlled);
		expect(m).toMatchObject({ direction: 'in', amount: 50n, bucketId: 'bucket-a' });
	});

	it('attributes an outflow to the larger contributing controlled input', () => {
		const m = netMovementForTx(
			tx(
				[
					['ctrlB', 20n],
					['ctrlA', 80n]
				],
				[['ext', 100n]]
			),
			controlled
		);
		expect(m).toMatchObject({ direction: 'out', amount: 100n, bucketId: 'bucket-a' });
	});

	it('yields a null bucket when the contributing address has none', () => {
		const m = netMovementForTx(tx([['ctrlB', 40n]], [['ext', 40n]]), controlled);
		expect(m).toMatchObject({ direction: 'out', bucketId: null });
	});
});

describe('netMovements and toEngineMovements', () => {
	it('keeps non-null movements in order and converts outflows for the engine', () => {
		const txs = [
			tx([['ctrlA', 100n]], [['ext', 100n]]),
			tx([['ctrlA', 50n]], [['ctrlB', 50n]]), // internal, dropped
			tx([['ext', 10n]], [['ctrlA', 10n]]) // inbound
		];
		const ms = netMovements(txs, controlled);
		expect(ms.map((m) => m.direction)).toEqual(['out', 'in']);

		const engine = toEngineMovements(ms, 'unassigned');
		expect(engine).toEqual([
			{ bucketId: 'bucket-a', at: new Date('2025-02-01T00:00:00Z'), amount: 100n }
		]);
	});

	it('falls back to the unassigned bucket id for null-bucket outflows', () => {
		const ms = netMovements([tx([['ctrlB', 40n]], [['ext', 40n]])], controlled);
		expect(toEngineMovements(ms, 'unassigned')[0].bucketId).toBe('unassigned');
	});
});
