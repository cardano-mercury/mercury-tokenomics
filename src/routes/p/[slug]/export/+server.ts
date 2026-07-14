import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import ExcelJS from 'exceljs';
import { db } from '$lib/server/db';
import { project, bucket, tokenMovement } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { assembleStatement } from '$lib/tokenomics/statement';
import { statementRows, statementTotalRow } from '$lib/tokenomics/export';
import { formatDateISO } from '$lib/format';

export const GET: RequestHandler = async ({ params, locals }) => {
	const [proj] = await db.select().from(project).where(eq(project.slug, params.slug));
	if (!proj) return error(404, 'Project not found');
	// Drafts can only be exported by their owner.
	if (proj.status !== 'published' && locals.user?.id !== proj.ownerId) {
		return error(404, 'Project not found');
	}

	const buckets = await db
		.select()
		.from(bucket)
		.where(eq(bucket.projectId, proj.id))
		.orderBy(asc(bucket.sortOrder));
	const movements = await db
		.select()
		.from(tokenMovement)
		.where(eq(tokenMovement.projectId, proj.id));

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

	const rows = statementRows(statement, proj.decimals);
	const total = statementTotalRow(statement, proj.decimals);

	const wb = new ExcelJS.Workbook();
	wb.creator = 'Mercury: Tokenomics Statements';
	const sheet = wb.addWorksheet('Statement');

	sheet.addRow([proj.name]);
	sheet.addRow([`Tokenomics statement as of ${formatDateISO(asOf)}`]);
	sheet.addRow([]);
	sheet.addRow(['Bucket', 'Promised', 'Delivered', 'Delivered %']);
	for (const r of rows) {
		sheet.addRow([r.name, r.promised, r.delivered, Number(r.deliveredPct.toFixed(2))]);
	}
	sheet.addRow([
		total.name,
		total.promised,
		total.delivered,
		Number(total.deliveredPct.toFixed(2))
	]);

	sheet.getColumn(1).width = 28;
	sheet.getColumn(2).width = 18;
	sheet.getColumn(3).width = 18;
	sheet.getColumn(4).width = 14;
	sheet.getRow(1).font = { bold: true, size: 14 };
	sheet.getRow(4).font = { bold: true };

	const buffer = await wb.xlsx.writeBuffer();
	return new Response(buffer, {
		headers: {
			'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'content-disposition': `attachment; filename="${proj.slug}-tokenomics.xlsx"`
		}
	});
};
