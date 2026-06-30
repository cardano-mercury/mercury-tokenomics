import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { project } from '$lib/server/db/schema';
import { and, or, eq, like, desc, count, type SQL } from 'drizzle-orm';
import { NETWORKS } from '$lib/projects/validation';

const PAGE_SIZE = 9;

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const networkParam = url.searchParams.get('network') ?? '';
	const network = (NETWORKS as readonly string[]).includes(networkParam) ? networkParam : '';
	const requestedPage = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const conditions: SQL[] = [eq(project.status, 'published')];
	if (q) {
		const term = `%${q}%`;
		const match = or(like(project.name, term), like(project.description, term));
		if (match) conditions.push(match);
	}
	if (network) conditions.push(eq(project.network, network as 'mainnet' | 'preprod' | 'preview'));
	const where = and(...conditions);

	const [{ total }] = await db.select({ total: count() }).from(project).where(where);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);

	const projects = await db
		.select({
			name: project.name,
			slug: project.slug,
			network: project.network,
			description: project.description,
			updatedAt: project.updatedAt
		})
		.from(project)
		.where(where)
		.orderBy(desc(project.updatedAt))
		.limit(PAGE_SIZE)
		.offset((currentPage - 1) * PAGE_SIZE);

	return {
		projects,
		total,
		page: currentPage,
		totalPages,
		pageSize: PAGE_SIZE,
		q,
		network
	};
};
