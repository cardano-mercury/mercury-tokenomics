import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(302, '/login');

	const projects = await db
		.select()
		.from(project)
		.where(eq(project.ownerId, locals.user.id))
		.orderBy(desc(project.updatedAt));

	return { user: locals.user, projects };
};
