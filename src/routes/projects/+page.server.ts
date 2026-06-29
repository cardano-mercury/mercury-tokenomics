import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const projects = await db
		.select({
			name: project.name,
			slug: project.slug,
			network: project.network,
			description: project.description,
			updatedAt: project.updatedAt
		})
		.from(project)
		.orderBy(desc(project.updatedAt));

	return { projects };
};
