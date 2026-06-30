import { pgTable, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from '@cardano-mercury/core/db';

/**
 * Tokenomics-specific tables on the shared Postgres database. They are prefixed
 * `tokenomics_` so they never collide with the other Mercury apps' tables in the
 * shared public schema, and they foreign-key to the shared `user` table owned by
 * mercury-core. Token amounts are decimal strings of integer base units (parsed
 * to bigint in the domain layer); timestamps are timestamptz. See docs/design.md.
 */

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
};

export const project = pgTable(
	'tokenomics_project',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		network: text('network', { enum: ['mainnet', 'preprod', 'preview'] })
			.notNull()
			.default('preprod'),
		// Draft projects are private to their owner; published projects are public.
		status: text('status', { enum: ['draft', 'published'] })
			.notNull()
			.default('draft'),
		policyId: text('policy_id').notNull(),
		assetNameHex: text('asset_name_hex').notNull().default(''),
		decimals: integer('decimals').notNull().default(0),
		// Total supply in base units, decimal string.
		totalSupply: text('total_supply').notNull().default('0'),
		// Token generation / sale date that anchors all schedules (T0).
		t0: timestamp('t0', { withTimezone: true }).notNull(),
		description: text('description'),
		website: text('website'),
		...timestamps
	},
	(t) => [
		uniqueIndex('tokenomics_project_slug_unq').on(t.slug),
		index('tokenomics_project_owner_idx').on(t.ownerId)
	]
);

export const bucket = pgTable(
	'tokenomics_bucket',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		// Allocation in base units, decimal string.
		allocation: text('allocation').notNull().default('0'),
		cliffMonths: integer('cliff_months').notNull().default(0),
		vestingMonths: integer('vesting_months').notNull().default(0),
		vestingType: text('vesting_type', {
			enum: ['linear', 'cliff', 'accelerated', 'custom']
		})
			.notNull()
			.default('linear'),
		// Lump sum released at T0, base units, decimal string.
		firstUnlock: text('first_unlock').notNull().default('0'),
		// Optional per-bucket T0 override.
		t0Override: timestamp('t0_override', { withTimezone: true }),
		// JSON array of { monthsAfterT0, cumulativeFraction } for the custom type.
		customCurve: text('custom_curve'),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(t) => [index('tokenomics_bucket_project_idx').on(t.projectId)]
);

export const controlledWallet = pgTable(
	'tokenomics_controlled_wallet',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		// Optional bucket assignment; cleared if the bucket is deleted.
		bucketId: text('bucket_id').references(() => bucket.id, { onDelete: 'set null' }),
		address: text('address').notNull(),
		label: text('label'),
		// JSON CIP-8 proof { signature, key } captured when ownership was proven.
		ownershipProof: text('ownership_proof'),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
		...timestamps
	},
	(t) => [
		index('tokenomics_wallet_project_idx').on(t.projectId),
		index('tokenomics_wallet_bucket_idx').on(t.bucketId),
		uniqueIndex('tokenomics_wallet_project_address_unq').on(t.projectId, t.address)
	]
);

export const transactionTag = pgTable(
	'tokenomics_transaction_tag',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		bucketId: text('bucket_id').references(() => bucket.id, { onDelete: 'set null' }),
		txHash: text('tx_hash').notNull(),
		outputIndex: integer('output_index'),
		category: text('category').notNull(),
		// Optional amount this tag accounts for, base units, decimal string.
		amount: text('amount'),
		note: text('note'),
		...timestamps
	},
	(t) => [
		index('tokenomics_tag_project_idx').on(t.projectId),
		index('tokenomics_tag_tx_idx').on(t.txHash)
	]
);

export const anchorRecord = pgTable(
	'tokenomics_anchor_record',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		version: integer('version').notNull(),
		payloadHash: text('payload_hash').notNull(),
		metadataLabel: integer('metadata_label').notNull(),
		txHash: text('tx_hash').notNull(),
		network: text('network', { enum: ['mainnet', 'preprod', 'preview'] }).notNull(),
		payloadUri: text('payload_uri'),
		anchoredAt: timestamp('anchored_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('tokenomics_anchor_project_idx').on(t.projectId),
		uniqueIndex('tokenomics_anchor_project_version_unq').on(t.projectId, t.version)
	]
);

export const tokenMovement = pgTable(
	'tokenomics_token_movement',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		projectId: text('project_id')
			.notNull()
			.references(() => project.id, { onDelete: 'cascade' }),
		bucketId: text('bucket_id').references(() => bucket.id, { onDelete: 'set null' }),
		txHash: text('tx_hash').notNull(),
		// Net external direction relative to the controlled set.
		direction: text('direction', { enum: ['out', 'in'] }).notNull(),
		// Net amount moved in this transaction, base units, decimal string.
		amount: text('amount').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
		counterparty: text('counterparty'),
		source: text('source', { enum: ['chain', 'manual', 'seed'] })
			.notNull()
			.default('chain'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('tokenomics_movement_project_idx').on(t.projectId),
		index('tokenomics_movement_bucket_idx').on(t.bucketId),
		uniqueIndex('tokenomics_movement_project_tx_dir_unq').on(t.projectId, t.txHash, t.direction)
	]
);

export const projectRelations = relations(project, ({ one, many }) => ({
	owner: one(user, { fields: [project.ownerId], references: [user.id] }),
	buckets: many(bucket),
	movements: many(tokenMovement),
	wallets: many(controlledWallet),
	tags: many(transactionTag),
	anchors: many(anchorRecord)
}));

export const bucketRelations = relations(bucket, ({ one, many }) => ({
	project: one(project, { fields: [bucket.projectId], references: [project.id] }),
	wallets: many(controlledWallet)
}));

export const controlledWalletRelations = relations(controlledWallet, ({ one }) => ({
	project: one(project, { fields: [controlledWallet.projectId], references: [project.id] }),
	bucket: one(bucket, { fields: [controlledWallet.bucketId], references: [bucket.id] })
}));

export const transactionTagRelations = relations(transactionTag, ({ one }) => ({
	project: one(project, { fields: [transactionTag.projectId], references: [project.id] }),
	bucket: one(bucket, { fields: [transactionTag.bucketId], references: [bucket.id] })
}));

export const anchorRecordRelations = relations(anchorRecord, ({ one }) => ({
	project: one(project, { fields: [anchorRecord.projectId], references: [project.id] })
}));

export const tokenMovementRelations = relations(tokenMovement, ({ one }) => ({
	project: one(project, { fields: [tokenMovement.projectId], references: [project.id] }),
	bucket: one(bucket, { fields: [tokenMovement.bucketId], references: [bucket.id] })
}));

// Shared Better Auth tables (user/session/account/verification/two_factor) owned by mercury-core.
export * from '@cardano-mercury/core/db';
