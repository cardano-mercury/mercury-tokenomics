import { describe, it, expect } from 'vitest';
import { buildDeclarationPayload } from './declaration';
import { hashDeclaration } from '$lib/tokenomics/anchor';

const project = {
	name: 'Acme',
	slug: 'acme',
	policyId: 'a'.repeat(56),
	assetNameHex: '41434d45',
	decimals: 6,
	totalSupply: '1000000000000',
	t0: new Date('2025-01-01T00:00:00Z'),
	network: 'preprod'
};

const buckets = [
	{
		name: 'Team',
		allocation: '400000000000',
		cliffMonths: 6,
		vestingMonths: 24,
		vestingType: 'linear',
		firstUnlock: '0'
	}
];

describe('buildDeclarationPayload', () => {
	it('shapes project data into the anchor payload with an ISO t0', () => {
		const payload = buildDeclarationPayload(project, buckets, ['addr1', 'addr2'], 1);
		expect(payload.version).toBe(1);
		expect(payload.project.t0).toBe('2025-01-01T00:00:00.000Z');
		expect(payload.buckets[0].name).toBe('Team');
		expect(payload.wallets).toEqual(['addr1', 'addr2']);
	});

	it('produces a stable hash for the same inputs and a different hash when data changes', () => {
		const a = hashDeclaration(buildDeclarationPayload(project, buckets, ['addr1'], 1));
		const b = hashDeclaration(buildDeclarationPayload(project, buckets, ['addr1'], 1));
		const c = hashDeclaration(buildDeclarationPayload(project, buckets, ['addr2'], 1));
		expect(a).toBe(b);
		expect(a).not.toBe(c);
	});
});
