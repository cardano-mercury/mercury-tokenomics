import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateProject, slugify, type NetworkName } from '$lib/projects/validation';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) return redirect(302, '/login');
	return {};
};

async function uniqueSlug(base: string): Promise<string> {
	const root = base || 'project';
	let candidate = root;
	let n = 1;
	// Append a numeric suffix until the slug is free.
	while (
		(await db.select({ id: project.id }).from(project).where(eq(project.slug, candidate))).length
	) {
		n += 1;
		candidate = `${root}-${n}`;
	}
	return candidate;
}

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.user) return redirect(302, '/login');
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
		const description = form.get('description')?.toString() ?? '';
		const website = form.get('website')?.toString() ?? '';

		const validation = validateProject(fields);
		if (!validation.ok) return fail(400, { message: validation.message, values: fields });

		const slug = await uniqueSlug(slugify(fields.name));
		const [created] = await db
			.insert(project)
			.values({
				ownerId: event.locals.user.id,
				name: fields.name.trim(),
				slug,
				network: fields.network as NetworkName,
				policyId: fields.policyId.trim().toLowerCase(),
				assetNameHex: fields.assetNameHex.trim().toLowerCase(),
				decimals: Number(fields.decimals),
				totalSupply: fields.totalSupply.trim(),
				t0: new Date(fields.t0),
				description: description.trim() || null,
				website: website.trim() || null
			})
			.returning({ id: project.id });

		return redirect(302, `/dashboard/projects/${created.id}`);
	}
};
