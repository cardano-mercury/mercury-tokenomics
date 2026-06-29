CREATE TABLE `anchor_record` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`version` integer NOT NULL,
	`payload_hash` text NOT NULL,
	`metadata_label` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`network` text NOT NULL,
	`payload_uri` text,
	`anchored_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `anchor_project_idx` ON `anchor_record` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `anchor_project_version_unq` ON `anchor_record` (`project_id`,`version`);--> statement-breakpoint
CREATE TABLE `bucket` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`allocation` text DEFAULT '0' NOT NULL,
	`cliff_months` integer DEFAULT 0 NOT NULL,
	`vesting_months` integer DEFAULT 0 NOT NULL,
	`vesting_type` text DEFAULT 'linear' NOT NULL,
	`first_unlock` text DEFAULT '0' NOT NULL,
	`t0_override` integer,
	`custom_curve` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bucket_project_idx` ON `bucket` (`project_id`);--> statement-breakpoint
CREATE TABLE `controlled_wallet` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`bucket_id` text,
	`address` text NOT NULL,
	`label` text,
	`ownership_proof` text,
	`verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bucket_id`) REFERENCES `bucket`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `wallet_project_idx` ON `controlled_wallet` (`project_id`);--> statement-breakpoint
CREATE INDEX `wallet_bucket_idx` ON `controlled_wallet` (`bucket_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_project_address_unq` ON `controlled_wallet` (`project_id`,`address`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`network` text DEFAULT 'preprod' NOT NULL,
	`policy_id` text NOT NULL,
	`asset_name_hex` text DEFAULT '' NOT NULL,
	`decimals` integer DEFAULT 0 NOT NULL,
	`total_supply` text DEFAULT '0' NOT NULL,
	`t0` integer NOT NULL,
	`description` text,
	`website` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_slug_unq` ON `project` (`slug`);--> statement-breakpoint
CREATE INDEX `project_owner_idx` ON `project` (`owner_id`);--> statement-breakpoint
CREATE TABLE `transaction_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`bucket_id` text,
	`tx_hash` text NOT NULL,
	`output_index` integer,
	`category` text NOT NULL,
	`amount` text,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bucket_id`) REFERENCES `bucket`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tag_project_idx` ON `transaction_tag` (`project_id`);--> statement-breakpoint
CREATE INDEX `tag_tx_idx` ON `transaction_tag` (`tx_hash`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);