import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project, bucket, controlledWallet, tokenMovement } from '$lib/server/db/schema';
import { and, eq, asc, desc } from 'drizzle-orm';
import {
	validateProject,
	validateBucket,
	parseBaseUnits,
	type NetworkName,
	type VestingTypeName
} from '$lib/projects/validation';
import { syncProjectMovements } from '$lib/server/koios';
import { controlledSetFor } from '$lib/server/cardano';

async function ownedProject(userId: string, id: string) {
	const [row] = await db
		.select()
		.from(project)
		.where(and(eq(project.id, id), eq(project.ownerId, userId)));
	return row;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return redirect(302, '/login');
	const owned = await ownedProject(locals.user.id, params.id);
	if (!owned) return error(404, 'Project not found');

	const buckets = await db
		.select()
		.from(bucket)
		.where(eq(bucket.projectId, owned.id))
		.orderBy(asc(bucket.sortOrder));
	const wallets = await db
		.select()
		.from(controlledWallet)
		.where(eq(controlledWallet.projectId, owned.id))
		.orderBy(asc(controlledWallet.createdAt));
	const movements = await db
		.select()
		.from(tokenMovement)
		.where(eq(tokenMovement.projectId, owned.id))
		.orderBy(desc(tokenMovement.occurredAt));

	return { project: owned, buckets, wallets, movements };
};

export const actions: Actions = {
	updateProject: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const fields = {
			name: form.get('name')?.toString() ?? '',
			policyId: form.get('policyId')?.toString() ?? '',
			assetNameHex: form.get('assetNameHex')?.toString() ?? '',
			decimals: form.get('decimals')?.toString() ?? '0',
			totalSupply: form.get('totalSupply')?.toString() ?? '0',
			t0: form.get('t0')?.toString() ?? '',
			network: form.get('network')?.toString() ?? 'preprod'
		};
		const validation = validateProject(fields);
		if (!validation.ok) return fail(400, { scope: 'project', message: validation.message });

		await db
			.update(project)
			.set({
				name: fields.name.trim(),
				policyId: fields.policyId.trim().toLowerCase(),
				assetNameHex: fields.assetNameHex.trim().toLowerCase(),
				decimals: Number(fields.decimals),
				totalSupply: fields.totalSupply.trim(),
				t0: new Date(fields.t0),
				network: fields.network as NetworkName,
				description: form.get('description')?.toString().trim() || null,
				website: form.get('website')?.toString().trim() || null
			})
			.where(eq(project.id, owned.id));
		return { scope: 'project', ok: true };
	},

	addBucket: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const fields = {
			name: form.get('name')?.toString() ?? '',
			allocation: form.get('allocation')?.toString() ?? '0',
			cliffMonths: form.get('cliffMonths')?.toString() ?? '0',
			vestingMonths: form.get('vestingMonths')?.toString() ?? '0',
			vestingType: form.get('vestingType')?.toString() ?? 'linear',
			firstUnlock: form.get('firstUnlock')?.toString() ?? '0'
		};
		const validation = validateBucket(fields);
		if (!validation.ok) return fail(400, { scope: 'bucket', message: validation.message });

		const existing = await db
			.select({ sortOrder: bucket.sortOrder })
			.from(bucket)
			.where(eq(bucket.projectId, owned.id));
		const nextOrder = existing.reduce((m, b) => Math.max(m, b.sortOrder + 1), 0);

		await db.insert(bucket).values({
			projectId: owned.id,
			name: fields.name.trim(),
			allocation: fields.allocation.trim(),
			cliffMonths: Number(fields.cliffMonths),
			vestingMonths: Number(fields.vestingMonths),
			vestingType: fields.vestingType as VestingTypeName,
			firstUnlock: (fields.firstUnlock || '0').trim(),
			sortOrder: nextOrder
		});
		return { scope: 'bucket', ok: true };
	},

	deleteBucket: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const bucketId = form.get('bucketId')?.toString() ?? '';
		await db.delete(bucket).where(and(eq(bucket.id, bucketId), eq(bucket.projectId, owned.id)));
		return { scope: 'bucket', ok: true };
	},

	addWallet: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const address = form.get('address')?.toString().trim() ?? '';
		const label = form.get('label')?.toString().trim() ?? '';
		const bucketId = form.get('bucketId')?.toString() ?? '';
		if (address.length < 10) {
			return fail(400, { scope: 'wallet', message: 'Please enter a valid address.' });
		}

		try {
			await db.insert(controlledWallet).values({
				projectId: owned.id,
				address,
				label: label || null,
				bucketId: bucketId || null
			});
		} catch {
			return fail(400, { scope: 'wallet', message: 'That address is already on this project.' });
		}
		return { scope: 'wallet', ok: true };
	},

	deleteWallet: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const walletId = form.get('walletId')?.toString() ?? '';
		await db
			.delete(controlledWallet)
			.where(and(eq(controlledWallet.id, walletId), eq(controlledWallet.projectId, owned.id)));
		return { scope: 'wallet', ok: true };
	},

	syncChain: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const wallets = await db
			.select()
			.from(controlledWallet)
			.where(eq(controlledWallet.projectId, owned.id));
		if (wallets.length === 0) {
			return fail(400, { scope: 'chain', message: 'Add at least one controlled wallet first.' });
		}

		try {
			const { movements, transactionsScanned } = await syncProjectMovements({
				network: owned.network,
				unit: { policyId: owned.policyId, assetNameHex: owned.assetNameHex },
				controlled: controlledSetFor(
					wallets.map((w) => ({ address: w.address, bucketId: w.bucketId }))
				)
			});

			await db
				.delete(tokenMovement)
				.where(and(eq(tokenMovement.projectId, owned.id), eq(tokenMovement.source, 'chain')));
			if (movements.length) {
				await db.insert(tokenMovement).values(
					movements.map((m) => ({
						projectId: owned.id,
						bucketId: m.bucketId,
						txHash: m.txHash,
						direction: m.direction,
						amount: m.amount.toString(),
						occurredAt: m.at,
						counterparty: m.counterparty,
						source: 'chain' as const
					}))
				);
			}
			return { scope: 'chain', ok: true, synced: movements.length, scanned: transactionsScanned };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Unknown error';
			return fail(502, { scope: 'chain', message: `Could not sync from Koios: ${message}` });
		}
	},

	addMovement: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const amountRaw = form.get('amount')?.toString() ?? '';
		const direction = form.get('direction')?.toString() === 'in' ? 'in' : 'out';
		const occurredAt = form.get('occurredAt')?.toString() ?? '';
		const bucketId = form.get('bucketId')?.toString() || null;

		if (parseBaseUnits(amountRaw) === null) {
			return fail(400, { scope: 'movement', message: 'Amount must be whole base units.' });
		}
		if (Number.isNaN(Date.parse(occurredAt))) {
			return fail(400, { scope: 'movement', message: 'Please provide a valid date.' });
		}

		await db.insert(tokenMovement).values({
			projectId: owned.id,
			bucketId,
			txHash: `manual-${crypto.randomUUID().slice(0, 8)}`,
			direction,
			amount: amountRaw.trim(),
			occurredAt: new Date(occurredAt),
			source: 'manual'
		});
		return { scope: 'movement', ok: true };
	},

	deleteMovement: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const movementId = form.get('movementId')?.toString() ?? '';
		await db
			.delete(tokenMovement)
			.where(and(eq(tokenMovement.id, movementId), eq(tokenMovement.projectId, owned.id)));
		return { scope: 'movement', ok: true };
	},

	setStatus: async (event) => {
		const user = event.locals.user;
		if (!user) return redirect(302, '/login');
		const owned = await ownedProject(user.id, event.params.id);
		if (!owned) return error(404, 'Project not found');

		const form = await event.request.formData();
		const status = form.get('status')?.toString() === 'published' ? 'published' : 'draft';
		await db.update(project).set({ status }).where(eq(project.id, owned.id));
		return { scope: 'status', ok: true, status };
	}
};
