import { describe, it, expect } from 'vitest';
import { slugify, parseBaseUnits, validateProject, validateBucket } from './validation';

describe('slugify', () => {
	it('lowercases and hyphenates', () => {
		expect(slugify('Mercury Tokenomics')).toBe('mercury-tokenomics');
	});
	it('strips punctuation and collapses separators', () => {
		expect(slugify('  Acme: Token!! v2  ')).toBe('acme-token-v2');
	});
	it('returns empty for non-alphanumeric input', () => {
		expect(slugify('!!!')).toBe('');
	});
});

describe('parseBaseUnits', () => {
	it('parses a digit string to bigint', () => {
		expect(parseBaseUnits('1000000')).toBe(1000000n);
		expect(parseBaseUnits('  42 ')).toBe(42n);
	});
	it('rejects non-digit, negative, and decimal input', () => {
		expect(parseBaseUnits('1.5')).toBeNull();
		expect(parseBaseUnits('-5')).toBeNull();
		expect(parseBaseUnits('1,000')).toBeNull();
		expect(parseBaseUnits('')).toBeNull();
	});
});

describe('validateProject', () => {
	const valid = {
		name: 'Mercury',
		policyId: 'a'.repeat(56),
		assetNameHex: '',
		decimals: '6',
		totalSupply: '1000000000',
		t0: '2025-01-01',
		network: 'preprod'
	};

	it('accepts a valid project', () => {
		expect(validateProject(valid)).toEqual({ ok: true });
	});
	it('rejects a short name', () => {
		expect(validateProject({ ...valid, name: 'x' }).ok).toBe(false);
	});
	it('rejects a malformed policy id', () => {
		expect(validateProject({ ...valid, policyId: 'abc' }).ok).toBe(false);
		expect(validateProject({ ...valid, policyId: 'g'.repeat(56) }).ok).toBe(false);
	});
	it('accepts empty asset name but rejects odd-length hex', () => {
		expect(validateProject({ ...valid, assetNameHex: '4d4552' }).ok).toBe(true);
		expect(validateProject({ ...valid, assetNameHex: 'abc' }).ok).toBe(false);
	});
	it('rejects out-of-range decimals', () => {
		expect(validateProject({ ...valid, decimals: '-1' }).ok).toBe(false);
		expect(validateProject({ ...valid, decimals: '31' }).ok).toBe(false);
		expect(validateProject({ ...valid, decimals: '1.5' }).ok).toBe(false);
	});
	it('rejects a non-integer total supply', () => {
		expect(validateProject({ ...valid, totalSupply: '1.5' }).ok).toBe(false);
	});
	it('rejects an invalid date and unknown network', () => {
		expect(validateProject({ ...valid, t0: 'not-a-date' }).ok).toBe(false);
		expect(validateProject({ ...valid, network: 'ethereum' }).ok).toBe(false);
	});
});

describe('validateBucket', () => {
	const valid = {
		name: 'Team',
		allocation: '4000000',
		cliffMonths: '6',
		vestingMonths: '24',
		vestingType: 'linear',
		firstUnlock: '0'
	};

	it('accepts a valid bucket', () => {
		expect(validateBucket(valid)).toEqual({ ok: true });
	});
	it('requires a name', () => {
		expect(validateBucket({ ...valid, name: '' }).ok).toBe(false);
	});
	it('rejects non-integer allocation and first unlock', () => {
		expect(validateBucket({ ...valid, allocation: '1.5' }).ok).toBe(false);
		expect(validateBucket({ ...valid, firstUnlock: 'x' }).ok).toBe(false);
	});
	it('rejects a first unlock larger than the allocation', () => {
		expect(validateBucket({ ...valid, firstUnlock: '5000000' }).ok).toBe(false);
	});
	it('rejects negative or non-integer months', () => {
		expect(validateBucket({ ...valid, cliffMonths: '-1' }).ok).toBe(false);
		expect(validateBucket({ ...valid, vestingMonths: '1.5' }).ok).toBe(false);
	});
	it('rejects an unknown vesting type', () => {
		expect(validateBucket({ ...valid, vestingType: 'magic' }).ok).toBe(false);
	});
	it('treats an empty first unlock as zero', () => {
		expect(validateBucket({ ...valid, firstUnlock: '' }).ok).toBe(true);
	});
});
