CREATE TABLE `token_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`bucket_id` text,
	`tx_hash` text NOT NULL,
	`direction` text NOT NULL,
	`amount` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`counterparty` text,
	`source` text DEFAULT 'chain' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bucket_id`) REFERENCES `bucket`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `movement_project_idx` ON `token_movement` (`project_id`);--> statement-breakpoint
CREATE INDEX `movement_bucket_idx` ON `token_movement` (`bucket_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `movement_project_tx_dir_unq` ON `token_movement` (`project_id`,`tx_hash`,`direction`);