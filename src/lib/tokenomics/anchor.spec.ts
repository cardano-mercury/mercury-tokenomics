import { describe, it, expect } from 'vitest';
import {
	METADATA_LABEL,
	canonicalize,
	hashDeclaration,
	buildMetadata,
	verifyDeclaration,
	type DeclarationPayload
} from './anchor';

function basePayload(): DeclarationPayload {
	return {
		version: 1,
		project: {
			name: 'Mercury',
			slug: 'mercury',
			policyId: 'a'.repeat(56),
			assetNameHex: '4d455243',
			decimals: 6,
			totalSupply: '1000000000000',
			t0: '2026-01-01T00:00:00.000Z',
			network: 'mainnet'
		},
		buckets: [
			{
				name: 'team',
				allocation: '200000000000',
				cliffMonths: 12,
				vestingMonths: 36,
				vestingType: 'linear',
				firstUnlock: '0'
			},
			{
				name: 'community',
				allocation: '500000000000',
				cliffMonths: 0,
				vestingMonths: 48,
				vestingType: 'cliff',
				firstUnlock: '10000000000'
			}
		],
		wallets: ['addr1qxy', 'addr1abc', 'addr1mno']
	};
}

/** Same logical declaration with buckets, wallets, and key order permuted. */
function permutedPayload(): DeclarationPayload {
	return {
		wallets: ['addr1mno', 'addr1abc', 'addr1qxy'],
		buckets: [
			{
				firstUnlock: '10000000000',
				vestingType: 'cliff',
				vestingMonths: 48,
				cliffMonths: 0,
				allocation: '500000000000',
				name: 'community'
			},
			{
				vestingMonths: 36,
				name: 'team',
				allocation: '200000000000',
				vestingType: 'linear',
				cliffMonths: 12,
				firstUnlock: '0'
			}
		],
		project: {
			network: 'mainnet',
			t0: '2026-01-01T00:00:00.000Z',
			totalSupply: '1000000000000',
			decimals: 6,
			assetNameHex: '4d455243',
			policyId: 'a'.repeat(56),
			slug: 'mercury',
			name: 'Mercury'
		},
		version: 1
	};
}

describe('canonicalize', () => {
	it('is identical across permuted bucket, wallet, and key order', () => {
		expect(canonicalize(permutedPayload())).toBe(canonicalize(basePayload()));
	});

	it('sorts object keys ascending recursively', () => {
		const out = canonicalize(basePayload());
		expect(out.indexOf('"buckets"')).toBeLessThan(out.indexOf('"project"'));
		expect(out.indexOf('"project"')).toBeLessThan(out.indexOf('"version"'));
		expect(out.indexOf('"version"')).toBeLessThan(out.indexOf('"wallets"'));
	});

	it('sorts buckets by name ascending', () => {
		const out = canonicalize(basePayload());
		expect(out.indexOf('"community"')).toBeLessThan(out.indexOf('"team"'));
	});

	it('sorts wallets ascending', () => {
		const out = canonicalize(basePayload());
		expect(out.indexOf('addr1abc')).toBeLessThan(out.indexOf('addr1mno'));
		expect(out.indexOf('addr1mno')).toBeLessThan(out.indexOf('addr1qxy'));
	});

	it('emits no insignificant whitespace', () => {
		const out = canonicalize(basePayload());
		expect(out).not.toMatch(/[\n\t]/);
		expect(out).not.toMatch(/: /);
		expect(out).not.toMatch(/, /);
	});

	it('does not mutate the input arrays', () => {
		const payload = basePayload();
		const bucketOrder = payload.buckets.map((b) => b.name);
		const walletOrder = [...payload.wallets];
		canonicalize(payload);
		expect(payload.buckets.map((b) => b.name)).toEqual(bucketOrder);
		expect(payload.wallets).toEqual(walletOrder);
	});

	it('differs when an allocation value changes', () => {
		const a = canonicalize(basePayload());
		const tampered = basePayload();
		tampered.buckets[0].allocation = '200000000001';
		expect(canonicalize(tampered)).not.toBe(a);
	});
});

describe('hashDeclaration', () => {
	it('is a 64-char lowercase hex string', () => {
		const hash = hashDeclaration(basePayload());
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('is deterministic across permutations', () => {
		expect(hashDeclaration(permutedPayload())).toBe(hashDeclaration(basePayload()));
	});

	it('changes when version changes', () => {
		const a = hashDeclaration(basePayload());
		const p = basePayload();
		p.version = 2;
		expect(hashDeclaration(p)).not.toBe(a);
	});

	it('changes when a bucket allocation changes', () => {
		const a = hashDeclaration(basePayload());
		const p = basePayload();
		p.buckets[1].allocation = '500000000001';
		expect(hashDeclaration(p)).not.toBe(a);
	});

	it('changes when a wallet changes', () => {
		const a = hashDeclaration(basePayload());
		const p = basePayload();
		p.wallets[0] = 'addr1zzz';
		expect(hashDeclaration(p)).not.toBe(a);
	});

	it('changes when t0 changes', () => {
		const a = hashDeclaration(basePayload());
		const p = basePayload();
		p.project.t0 = '2026-02-01T00:00:00.000Z';
		expect(hashDeclaration(p)).not.toBe(a);
	});
});

describe('buildMetadata', () => {
	it('returns the metadata label', () => {
		expect(buildMetadata(basePayload()).label).toBe(METADATA_LABEL);
		expect(METADATA_LABEL).toBe(5283);
	});

	it('mirrors version and slug', () => {
		const { metadata } = buildMetadata(basePayload());
		expect(metadata.v).toBe(1);
		expect(metadata.slug).toBe('mercury');
		expect(metadata.hash).toBe(hashDeclaration(basePayload()));
	});

	it('omits uri when not provided', () => {
		const { metadata } = buildMetadata(basePayload());
		expect('uri' in metadata).toBe(false);
	});

	it('includes uri when provided', () => {
		const { metadata } = buildMetadata(basePayload(), 'ipfs://abc');
		expect(metadata.uri).toBe('ipfs://abc');
	});

	it('omits uri for an empty string', () => {
		const { metadata } = buildMetadata(basePayload(), '');
		expect('uri' in metadata).toBe(false);
	});
});

describe('verifyDeclaration', () => {
	it('returns true for the matching hash', () => {
		const payload = basePayload();
		expect(verifyDeclaration(payload, hashDeclaration(payload))).toBe(true);
	});

	it('returns true regardless of expected hash case', () => {
		const payload = basePayload();
		expect(verifyDeclaration(payload, hashDeclaration(payload).toUpperCase())).toBe(true);
	});

	it('returns true for a permuted but equivalent payload', () => {
		expect(verifyDeclaration(permutedPayload(), hashDeclaration(basePayload()))).toBe(true);
	});

	it('returns false for a tampered payload', () => {
		const expected = hashDeclaration(basePayload());
		const tampered = basePayload();
		tampered.buckets[0].allocation = '999999999999';
		expect(verifyDeclaration(tampered, expected)).toBe(false);
	});

	it('returns false for an unrelated hash', () => {
		expect(verifyDeclaration(basePayload(), '0'.repeat(64))).toBe(false);
	});
});
