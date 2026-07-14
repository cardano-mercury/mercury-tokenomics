/**
 * Pure validation and parsing for project and bucket input. Kept separate from
 * the server actions so it can be unit tested. Amounts are validated as integer
 * base-unit strings; they are never parsed as floats.
 */

export type ValidationResult = { ok: true } | { ok: false; message: string };

export const VESTING_TYPES = ['linear', 'cliff', 'accelerated', 'custom'] as const;
export type VestingTypeName = (typeof VESTING_TYPES)[number];

export const NETWORKS = ['mainnet', 'preprod', 'preview'] as const;
export type NetworkName = (typeof NETWORKS)[number];

/** Convert a display name to a URL-safe slug. */
export function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Parse a non-negative integer base-unit string to bigint, or null if invalid. */
export function parseBaseUnits(value: string): bigint | null {
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	return BigInt(trimmed);
}

export interface ProjectInput {
	name: string;
	policyId: string;
	assetNameHex: string;
	decimals: string;
	totalSupply: string;
	t0: string;
	network: string;
}

export function validateProject(input: ProjectInput): ValidationResult {
	if (input.name.trim().length < 2) return { ok: false, message: 'Project name is required.' };
	if (!/^[0-9a-fA-F]{56}$/.test(input.policyId.trim())) {
		return { ok: false, message: 'Policy id must be 56 hex characters.' };
	}
	if (input.assetNameHex.trim() && !/^([0-9a-fA-F]{2})+$/.test(input.assetNameHex.trim())) {
		return { ok: false, message: 'Asset name must be even-length hex, or empty.' };
	}
	const decimals = Number(input.decimals);
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
		return { ok: false, message: 'Decimals must be a whole number between 0 and 30.' };
	}
	if (parseBaseUnits(input.totalSupply) === null) {
		return { ok: false, message: 'Total supply must be a whole number of base units.' };
	}
	if (Number.isNaN(Date.parse(input.t0))) {
		return { ok: false, message: 'Please provide a valid token generation date.' };
	}
	if (!(NETWORKS as readonly string[]).includes(input.network)) {
		return { ok: false, message: 'Unknown network.' };
	}
	return { ok: true };
}

export interface BucketInput {
	name: string;
	allocation: string;
	cliffMonths: string;
	vestingMonths: string;
	vestingType: string;
	firstUnlock: string;
}

export function validateBucket(input: BucketInput): ValidationResult {
	if (input.name.trim().length < 1) return { ok: false, message: 'Bucket name is required.' };

	const allocation = parseBaseUnits(input.allocation);
	if (allocation === null) {
		return { ok: false, message: 'Allocation must be a whole number of base units.' };
	}

	const firstUnlock = parseBaseUnits(input.firstUnlock || '0');
	if (firstUnlock === null) {
		return { ok: false, message: 'First unlock must be a whole number of base units.' };
	}
	if (firstUnlock > allocation) {
		return { ok: false, message: 'First unlock cannot exceed the allocation.' };
	}

	const cliff = Number(input.cliffMonths);
	const vesting = Number(input.vestingMonths);
	if (!Number.isInteger(cliff) || cliff < 0) {
		return { ok: false, message: 'Cliff must be a whole number of months.' };
	}
	if (!Number.isInteger(vesting) || vesting < 0) {
		return { ok: false, message: 'Vesting must be a whole number of months.' };
	}
	if (!(VESTING_TYPES as readonly string[]).includes(input.vestingType)) {
		return { ok: false, message: 'Unknown vesting type.' };
	}
	return { ok: true };
}
