import { blake2b } from '@noble/hashes/blake2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

/**
 * On-chain anchoring of a project's declared tokenomics. The declaration is
 * canonicalized to a deterministic JSON string, hashed with blake2b-256, and
 * published as transaction metadata so the declaration is tamper-evident. Pure:
 * no SvelteKit, database, or network imports belong here.
 */

/** Cardano transaction metadata label the declaration is published under. */
export const METADATA_LABEL = 5283;

export interface AnchorBucket {
	name: string;
	/** Tokens allocated to the bucket, base units, decimal string. */
	allocation: string;
	cliffMonths: number;
	vestingMonths: number;
	vestingType: string;
	/** Lump sum released at T0, base units, decimal string. */
	firstUnlock: string;
}

export interface DeclarationPayload {
	version: number;
	project: {
		name: string;
		slug: string;
		policyId: string;
		assetNameHex: string;
		decimals: number;
		/** Total supply, base units, decimal string. */
		totalSupply: string;
		/** Schedule anchor, ISO 8601 string. */
		t0: string;
		/** 'mainnet' | 'preprod' | 'preview'. */
		network: string;
	};
	buckets: AnchorBucket[];
	/** Controlled addresses. */
	wallets: string[];
}

/**
 * Deterministic JSON string for a declaration. Object keys are sorted
 * recursively ascending, buckets are sorted by name ascending, wallets are
 * sorted ascending, and no insignificant whitespace is emitted. Two payloads
 * that differ only in input ordering yield identical output.
 */
export function canonicalize(payload: DeclarationPayload): string {
	const normalized = {
		...payload,
		buckets: [...payload.buckets].sort((a, b) => compareStrings(a.name, b.name)),
		wallets: [...payload.wallets].sort(compareStrings)
	};
	return stableStringify(normalized);
}

/**
 * Lowercase hex blake2b-256 (32-byte digest) of the UTF-8 bytes of the
 * canonical declaration.
 */
export function hashDeclaration(payload: DeclarationPayload): string {
	const bytes = new TextEncoder().encode(canonicalize(payload));
	return bytesToHex(blake2b(bytes, { dkLen: 32 }));
}

export interface AnchorMetadata {
	v: number;
	slug: string;
	hash: string;
	uri?: string;
}

/** The metadata object, with its label, to publish on chain. */
export function buildMetadata(
	payload: DeclarationPayload,
	uri?: string
): { label: number; metadata: AnchorMetadata } {
	return {
		label: METADATA_LABEL,
		metadata: {
			v: payload.version,
			slug: payload.project.slug,
			hash: hashDeclaration(payload),
			...(uri ? { uri } : {})
		}
	};
}

/** True when the recomputed hash matches the expected hash, case-insensitively. */
export function verifyDeclaration(payload: DeclarationPayload, expectedHash: string): boolean {
	return hashDeclaration(payload).toLowerCase() === expectedHash.toLowerCase();
}

/** Stable comparator for ascending string sort, independent of locale. */
function compareStrings(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

/**
 * JSON serialization with object keys sorted ascending recursively. Array order
 * is preserved as given; callers sort arrays that require a canonical order
 * before serializing.
 */
function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return '[' + value.map(stableStringify).join(',') + ']';
	}
	const record = value as Record<string, unknown>;
	const entries = Object.keys(record)
		.sort(compareStrings)
		.map((key) => JSON.stringify(key) + ':' + stableStringify(record[key]));
	return '{' + entries.join(',') + '}';
}
