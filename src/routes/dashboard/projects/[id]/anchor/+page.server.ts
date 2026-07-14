import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project, bucket, controlledWallet, anchorRecord } from '$lib/server/db/schema';
import { and, eq, asc, desc } from 'drizzle-orm';
import { buildDeclarationPayload } from '$lib/server/declaration';
import {
	canonicalize,
	hashDeclaration,
	buildMetadata,
	METADATA_LABEL
} from '$lib/tokenomics/anchor';

async function ownedProject(userId: string, id: string) {
	const [row] = await db
		.select()
		.from(project)
		.where(and(eq(project.id, id), eq(project.ownerId, userId)));
	return row;
}

async function declarationFor(projectId: string, version: number) {
	const proj = (await db.select().from(project).where(eq(project.id, projectId)))[0];
	const buckets = await db
		.select()
		.from(bucket)
		.where(eq(bucket.projectId, projectId))
		.orderBy(asc(bucket.sortOrder));
	const wallets = await db
		.select()
		.from(controlledWallet)
		.where(eq(controlledWallet.projectId, projectId))
		.orderBy(asc(controlledWallet.createdAt));
	return buildDeclarationPayload(
		{ ...proj, t0: new Date(proj.t0) },
		buckets,
		wallets.map((w) => w.address),
		version
	);
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return redirect(302, '/login');
	const owned = await ownedProject(locals.user.id, params.id);
	if (!owned) return error(404, 'Project not found');

	const [latest] = await db
		.select()
		.from(anchorRecord)
		.where(eq(anchorRecord.projectId, owned.id))
		.orderBy(desc(anchorRecord.version))
		.limit(1);

	const nextVersion = (latest?.version ?? 0) + 1;
	const payload = await declarationFor(owned.id, nextVersion);
	const hash = hashDeclaration(payload);
	const { label, metadata } = buildMetadata(payload);

	return {
		id: owned.id,
		projectName: owned.name,
		network: owned.network,
		nextVersion,
		canonical: canonicalize(payload),
		hash,
		metadataLabel: label,
		metadataJson: JSON.stringify(metadata, null, 2),
		latest: latest
			? { version: latest.version, hash: latest.payloadHash, txHash: latest.txHash }
			: null
	};
};

export const actions: Actions = {
	record: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const txHash = form.get('txHash')?.toString().trim().toLowerCase() ?? '';
		const payloadUri = form.get('payloadUri')?.toString().trim() || null;
		if (!/^[0-9a-f]{64}$/.test(txHash)) {
			return fail(400, { message: 'Enter the 64-character hex transaction hash.' });
		}

		const [latest] = await db
			.select({ version: anchorRecord.version })
			.from(anchorRecord)
			.where(eq(anchorRecord.projectId, owned.id))
			.orderBy(desc(anchorRecord.version))
			.limit(1);
		const nextVersion = (latest?.version ?? 0) + 1;

		const payload = await declarationFor(owned.id, nextVersion);
		await db.insert(anchorRecord).values({
			projectId: owned.id,
			version: nextVersion,
			payloadHash: hashDeclaration(payload),
			metadataLabel: METADATA_LABEL,
			txHash,
			network: owned.network,
			payloadUri,
			anchoredAt: new Date()
		});

		return redirect(302, `/dashboard/projects/${owned.id}`);
	}
};
