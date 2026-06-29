import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { user } from './auth.schema';

/**
 * Token amounts are stored as decimal strings of integer base units (no decimal
 * point), so arbitrary precision survives the round trip to the chain. The
 * domain layer parses them to bigint. Timestamps are stored as epoch
 * milliseconds. See docs/design.md for the data model rationale.
 */

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
};

export const project = sqliteTable(
	'project',
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
		policyId: text('policy_id').notNull(),
		assetNameHex: text('asset_name_hex').notNull().default(''),
		decimals: integer('decimals').notNull().default(0),
		// Total supply in base units, decimal string.
		totalSupply: text('total_supply').notNull().default('0'),
		// Token generation / sale date that anchors all schedules (T0).
		t0: integer('t0', { mode: 'timestamp_ms' }).notNull(),
		description: text('description'),
		website: text('website'),
		...timestamps
	},
	(t) => [uniqueIndex('project_slug_unq').on(t.slug), index('project_owner_idx').on(t.ownerId)]
);

export const bucket = sqliteTable(
	'bucket',
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
		t0Override: integer('t0_override', { mode: 'timestamp_ms' }),
		// JSON array of { monthsAfterT0, cumulativeFraction } for the custom type.
		customCurve: text('custom_curve'),
		sortOrder: integer('sort_order').notNull().default(0),
		...timestamps
	},
	(t) => [index('bucket_project_idx').on(t.projectId)]
);

export const controlledWallet = sqliteTable(
	'controlled_wallet',
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
		verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(t) => [
		index('wallet_project_idx').on(t.projectId),
		index('wallet_bucket_idx').on(t.bucketId),
		uniqueIndex('wallet_project_address_unq').on(t.projectId, t.address)
	]
);

export const transactionTag = sqliteTable(
	'transaction_tag',
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
	(t) => [index('tag_project_idx').on(t.projectId), index('tag_tx_idx').on(t.txHash)]
);

export const anchorRecord = sqliteTable(
	'anchor_record',
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
		anchoredAt: integer('anchored_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [
		index('anchor_project_idx').on(t.projectId),
		uniqueIndex('anchor_project_version_unq').on(t.projectId, t.version)
	]
);

export const tokenMovement = sqliteTable(
	'token_movement',
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
		occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
		counterparty: text('counterparty'),
		source: text('source', { enum: ['chain', 'manual', 'seed'] })
			.notNull()
			.default('chain'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [
		index('movement_project_idx').on(t.projectId),
		index('movement_bucket_idx').on(t.bucketId),
		uniqueIndex('movement_project_tx_dir_unq').on(t.projectId, t.txHash, t.direction)
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

export * from './auth.schema';
