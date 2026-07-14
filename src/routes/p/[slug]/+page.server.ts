import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	project,
	bucket,
	tokenMovement,
	anchorRecord,
	controlledWallet
} from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { assembleStatement } from '$lib/tokenomics/statement';
import { buildChartData } from '$lib/charts';
import { scaleToNumber } from '$lib/charts';
import { buildDeclarationPayload } from '$lib/server/declaration';
import { hashDeclaration } from '$lib/tokenomics/anchor';

function hexToTicker(hex: string): string {
	if (!hex) return 'tokens';
	try {
		const decoded = Buffer.from(hex, 'hex').toString('utf8');
		return /^[\x20-\x7e]+$/.test(decoded) ? decoded : 'tokens';
	} catch {
		return 'tokens';
	}
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const [proj] = await db.select().from(project).where(eq(project.slug, params.slug));
	if (!proj) return error(404, 'Project not found');

	const isOwner = locals.user?.id === proj.ownerId;
	// Drafts are visible only to their owner, as a preview.
	if (proj.status !== 'published' && !isOwner) return error(404, 'Project not found');

	const buckets = await db
		.select()
		.from(bucket)
		.where(eq(bucket.projectId, proj.id))
		.orderBy(asc(bucket.sortOrder));
	const movements = await db
		.select()
		.from(tokenMovement)
		.where(eq(tokenMovement.projectId, proj.id));
	const [anchor] = await db
		.select()
		.from(anchorRecord)
		.where(eq(anchorRecord.projectId, proj.id))
		.orderBy(desc(anchorRecord.version))
		.limit(1);
	const wallets = await db
		.select({ id: controlledWallet.id, address: controlledWallet.address })
		.from(controlledWallet)
		.where(eq(controlledWallet.projectId, proj.id));

	const now = new Date();
	const asOf = now.getTime() < new Date(proj.t0).getTime() ? new Date(proj.t0) : now;

	const statement = assembleStatement(
		{ t0: new Date(proj.t0) },
		buckets.map((b) => ({
			id: b.id,
			name: b.name,
			allocation: b.allocation,
			firstUnlock: b.firstUnlock,
			cliffMonths: b.cliffMonths,
			vestingMonths: b.vestingMonths,
			vestingType: b.vestingType,
			t0Override: b.t0Override,
			customCurve: b.customCurve
		})),
		movements.map((m) => ({
			bucketId: m.bucketId,
			amount: m.amount,
			occurredAt: new Date(m.occurredAt),
			direction: m.direction
		})),
		{ asOf }
	);

	const chart = buildChartData(statement, proj.decimals);

	let verified: boolean | null = null;
	if (anchor) {
		const payload = buildDeclarationPayload(
			{ ...proj, t0: new Date(proj.t0) },
			buckets,
			wallets.map((w) => w.address),
			anchor.version
		);
		verified = hashDeclaration(payload).toLowerCase() === anchor.payloadHash.toLowerCase();
	}

	return {
		preview: proj.status !== 'published' && isOwner,
		project: {
			name: proj.name,
			slug: proj.slug,
			network: proj.network,
			status: proj.status,
			policyId: proj.policyId,
			description: proj.description,
			website: proj.website,
			decimals: proj.decimals,
			totalSupply: scaleToNumber(BigInt(proj.totalSupply), proj.decimals),
			t0: new Date(proj.t0).toISOString()
		},
		ticker: hexToTicker(proj.assetNameHex),
		chart,
		walletCount: wallets.length,
		movementCount: movements.length,
		anchor: anchor
			? {
					version: anchor.version,
					hash: anchor.payloadHash,
					txHash: anchor.txHash,
					anchoredAt: new Date(anchor.anchoredAt).toISOString(),
					verified
				}
			: null
	};
};
