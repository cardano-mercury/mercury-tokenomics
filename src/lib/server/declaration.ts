import type { DeclarationPayload } from '$lib/tokenomics/anchor';

/**
 * Builds the canonical declaration payload that gets hashed and anchored. Pure:
 * it shapes stored project data into the structure the anchor module expects.
 */

export interface DeclarationProject {
	name: string;
	slug: string;
	policyId: string;
	assetNameHex: string;
	decimals: number;
	totalSupply: string;
	t0: Date;
	network: string;
}

export interface DeclarationBucket {
	name: string;
	allocation: string;
	cliffMonths: number;
	vestingMonths: number;
	vestingType: string;
	firstUnlock: string;
}

export function buildDeclarationPayload(
	project: DeclarationProject,
	buckets: DeclarationBucket[],
	walletAddresses: string[],
	version: number
): DeclarationPayload {
	return {
		version,
		project: {
			name: project.name,
			slug: project.slug,
			policyId: project.policyId,
			assetNameHex: project.assetNameHex,
			decimals: project.decimals,
			totalSupply: project.totalSupply,
			t0: project.t0.toISOString(),
			network: project.network
		},
		buckets: buckets.map((b) => ({
			name: b.name,
			allocation: b.allocation,
			cliffMonths: b.cliffMonths,
			vestingMonths: b.vestingMonths,
			vestingType: b.vestingType,
			firstUnlock: b.firstUnlock
		})),
		wallets: walletAddresses
	};
}
