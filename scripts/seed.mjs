/**
 * Seeds demo projects so the app is explorable immediately. Idempotent: it
 * removes the demo projects by slug and reinserts them. The demo owner is a row
 * in the shared `user` table; the seeded projects are published and visible on
 * the public directory and statement pages without signing in.
 * Run with: npm run db:seed
 */
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

const DB_URL = process.env.DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5544/local';
const sql = postgres(DB_URL);

const MS_PER_MONTH = 2_629_800_000;
const now = new Date();
const unit = (tokens) => (BigInt(tokens) * 1_000_000n).toString(); // 6 decimals
const monthsAgo = (m) => new Date(now.getTime() - m * MS_PER_MONTH);
const afterT0 = (t0, months) => new Date(t0.getTime() + months * MS_PER_MONTH);

const OWNER_ID = 'tokenomics-seed-owner';

const projects = [
	{
		slug: 'helios-protocol',
		name: 'Helios Protocol',
		description: 'A solar-themed DeFi protocol. Demo data for the Mercury tokenomics POC.',
		website: 'https://example.com',
		policyId: 'a'.repeat(56),
		assetNameHex: Buffer.from('HELIOS').toString('hex'),
		totalSupply: unit(1_000_000_000),
		t0: monthsAgo(20),
		buckets: [
			{
				name: 'ISPO',
				alloc: 150_000_000,
				cliff: 0,
				vest: 12,
				type: 'linear',
				first: 0,
				delivered: [
					[2, 20_000_000],
					[6, 60_000_000],
					[12, 70_000_000]
				]
			},
			{
				name: 'Team',
				alloc: 200_000_000,
				cliff: 12,
				vest: 24,
				type: 'linear',
				first: 0,
				delivered: [
					[14, 10_000_000],
					[18, 15_000_000]
				]
			},
			{
				name: 'Public Sale',
				alloc: 300_000_000,
				cliff: 0,
				vest: 6,
				type: 'cliff',
				first: 100_000_000,
				delivered: [
					[0, 100_000_000],
					[3, 90_000_000],
					[6, 100_000_000]
				]
			},
			{
				name: 'Liquidity',
				alloc: 150_000_000,
				cliff: 0,
				vest: 0,
				type: 'linear',
				first: 0,
				delivered: [[0, 150_000_000]]
			},
			{
				name: 'Treasury',
				alloc: 200_000_000,
				cliff: 6,
				vest: 36,
				type: 'linear',
				first: 0,
				delivered: [
					[10, 8_000_000],
					[16, 12_000_000]
				]
			}
		],
		wallets: [
			{
				label: 'ISPO rewards',
				bucket: 'ISPO',
				address: 'addr1qxhelios_ispo_demo_0000000000000000000000000000000000000000'
			},
			{
				label: 'Team vesting',
				bucket: 'Team',
				address: 'addr1qxhelios_team_demo_0000000000000000000000000000000000000000'
			},
			{
				label: 'Treasury',
				bucket: 'Treasury',
				address: 'addr1qxhelios_treas_demo_000000000000000000000000000000000000000'
			}
		]
	},
	{
		slug: 'acme-dao',
		name: 'Acme DAO',
		description: 'A community DAO with a simple two-bucket split. Demo data.',
		website: null,
		policyId: 'b'.repeat(56),
		assetNameHex: Buffer.from('ACME').toString('hex'),
		totalSupply: unit(100_000_000),
		t0: monthsAgo(8),
		buckets: [
			{
				name: 'Community',
				alloc: 70_000_000,
				cliff: 0,
				vest: 18,
				type: 'linear',
				first: 5_000_000,
				delivered: [
					[1, 5_000_000],
					[4, 9_000_000],
					[7, 8_000_000]
				]
			},
			{
				name: 'Core Team',
				alloc: 30_000_000,
				cliff: 6,
				vest: 24,
				type: 'linear',
				first: 0,
				delivered: [[7, 1_000_000]]
			}
		],
		wallets: [
			{
				label: 'Community treasury',
				bucket: 'Community',
				address: 'addr1qxacme_community_demo_00000000000000000000000000000000000000'
			}
		]
	}
];

await sql.begin(async (sql) => {
	await sql`
		insert into "user" ${sql({
			id: OWNER_ID,
			name: 'Demo Owner',
			email: 'demo-owner@example.com',
			email_verified: true,
			created_at: now,
			updated_at: now
		})}
		on conflict (id) do nothing
	`;

	for (const p of projects) {
		await sql`delete from tokenomics_project where slug = ${p.slug}`;

		const projectId = randomUUID();
		await sql`
			insert into tokenomics_project ${sql({
				id: projectId,
				owner_id: OWNER_ID,
				name: p.name,
				slug: p.slug,
				network: 'preprod',
				status: 'published',
				policy_id: p.policyId,
				asset_name_hex: p.assetNameHex,
				decimals: 6,
				total_supply: p.totalSupply,
				t0: p.t0,
				description: p.description,
				website: p.website,
				created_at: now,
				updated_at: now
			})}
		`;

		const bucketIds = {};
		for (let i = 0; i < p.buckets.length; i++) {
			const b = p.buckets[i];
			const bucketId = randomUUID();
			bucketIds[b.name] = bucketId;
			await sql`
				insert into tokenomics_bucket ${sql({
					id: bucketId,
					project_id: projectId,
					name: b.name,
					allocation: unit(b.alloc),
					cliff_months: b.cliff,
					vesting_months: b.vest,
					vesting_type: b.type,
					first_unlock: unit(b.first),
					sort_order: i,
					created_at: now,
					updated_at: now
				})}
			`;

			for (const [months, tokens] of b.delivered) {
				await sql`
					insert into tokenomics_token_movement ${sql({
						id: randomUUID(),
						project_id: projectId,
						bucket_id: bucketId,
						tx_hash: `seed-${randomUUID().slice(0, 12)}`,
						direction: 'out',
						amount: unit(tokens),
						occurred_at: afterT0(p.t0, months),
						source: 'seed',
						created_at: now
					})}
				`;
			}
		}

		for (const w of p.wallets) {
			await sql`
				insert into tokenomics_controlled_wallet ${sql({
					id: randomUUID(),
					project_id: projectId,
					bucket_id: bucketIds[w.bucket] ?? null,
					address: w.address,
					label: w.label,
					created_at: now,
					updated_at: now
				})}
			`;
		}

		console.log(`seeded ${p.name} (/${p.slug})`);
	}
});

await sql.end();
console.log('Seed complete.');
