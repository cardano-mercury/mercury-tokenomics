/**
 * Seeds demo projects so the app is explorable immediately. Idempotent: it
 * removes the demo projects by slug and reinserts them. The demo owner is a
 * placeholder user; the seeded projects are visible on the public directory and
 * statement pages without signing in. Run with: npm run db:seed
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const DB_PATH = process.env.DATABASE_URL || 'local.db';
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const MS_PER_MONTH = 2_629_800_000;
const now = Date.now();
const unit = (tokens) => (BigInt(tokens) * 1_000_000n).toString(); // 6 decimals
const monthsAgo = (m) => now - m * MS_PER_MONTH;

const OWNER_ID = 'seed-owner-0000-0000-000000000000';

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

const insertUser = db.prepare(
	`INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
	 VALUES (?, ?, ?, 1, ?, ?)`
);
const deleteProjectBySlug = db.prepare('DELETE FROM project WHERE slug = ?');
const insertProject = db.prepare(
	`INSERT INTO project (id, owner_id, name, slug, network, status, policy_id, asset_name_hex, decimals, total_supply, t0, description, website, created_at, updated_at)
	 VALUES (@id, @owner_id, @name, @slug, 'preprod', 'published', @policy_id, @asset_name_hex, 6, @total_supply, @t0, @description, @website, @created_at, @updated_at)`
);
const insertBucket = db.prepare(
	`INSERT INTO bucket (id, project_id, name, allocation, cliff_months, vesting_months, vesting_type, first_unlock, sort_order, created_at, updated_at)
	 VALUES (@id, @project_id, @name, @allocation, @cliff_months, @vesting_months, @vesting_type, @first_unlock, @sort_order, @created_at, @updated_at)`
);
const insertWallet = db.prepare(
	`INSERT INTO controlled_wallet (id, project_id, bucket_id, address, label, created_at, updated_at)
	 VALUES (@id, @project_id, @bucket_id, @address, @label, @created_at, @updated_at)`
);
const insertMovement = db.prepare(
	`INSERT INTO token_movement (id, project_id, bucket_id, tx_hash, direction, amount, occurred_at, source, created_at)
	 VALUES (@id, @project_id, @bucket_id, @tx_hash, 'out', @amount, @occurred_at, 'seed', @created_at)`
);

const seed = db.transaction(() => {
	insertUser.run(OWNER_ID, 'Demo Owner', 'demo-owner@example.com', now, now);

	for (const p of projects) {
		deleteProjectBySlug.run(p.slug);
		const projectId = randomUUID();
		insertProject.run({
			id: projectId,
			owner_id: OWNER_ID,
			name: p.name,
			slug: p.slug,
			policy_id: p.policyId,
			asset_name_hex: p.assetNameHex,
			total_supply: p.totalSupply,
			t0: p.t0,
			description: p.description,
			website: p.website,
			created_at: now,
			updated_at: now
		});

		const bucketIds = {};
		p.buckets.forEach((b, i) => {
			const bucketId = randomUUID();
			bucketIds[b.name] = bucketId;
			insertBucket.run({
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
			});

			for (const [monthsAfterT0, tokens] of b.delivered) {
				insertMovement.run({
					id: randomUUID(),
					project_id: projectId,
					bucket_id: bucketId,
					tx_hash: `seed-${randomUUID().slice(0, 12)}`,
					amount: unit(tokens),
					occurred_at: p.t0 + monthsAfterT0 * MS_PER_MONTH,
					created_at: now
				});
			}
		});

		for (const w of p.wallets) {
			insertWallet.run({
				id: randomUUID(),
				project_id: projectId,
				bucket_id: bucketIds[w.bucket] ?? null,
				address: w.address,
				label: w.label,
				created_at: now,
				updated_at: now
			});
		}

		console.log(`seeded ${p.name} (/${p.slug})`);
	}
});

seed();
db.close();
console.log('Seed complete.');
