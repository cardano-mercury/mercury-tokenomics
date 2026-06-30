CREATE TABLE "tokenomics_anchor_record" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"version" integer NOT NULL,
	"payload_hash" text NOT NULL,
	"metadata_label" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"network" text NOT NULL,
	"payload_uri" text,
	"anchored_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokenomics_bucket" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"allocation" text DEFAULT '0' NOT NULL,
	"cliff_months" integer DEFAULT 0 NOT NULL,
	"vesting_months" integer DEFAULT 0 NOT NULL,
	"vesting_type" text DEFAULT 'linear' NOT NULL,
	"first_unlock" text DEFAULT '0' NOT NULL,
	"t0_override" timestamp with time zone,
	"custom_curve" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokenomics_controlled_wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"bucket_id" text,
	"address" text NOT NULL,
	"label" text,
	"ownership_proof" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokenomics_project" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"network" text DEFAULT 'preprod' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"policy_id" text NOT NULL,
	"asset_name_hex" text DEFAULT '' NOT NULL,
	"decimals" integer DEFAULT 0 NOT NULL,
	"total_supply" text DEFAULT '0' NOT NULL,
	"t0" timestamp with time zone NOT NULL,
	"description" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokenomics_token_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"bucket_id" text,
	"tx_hash" text NOT NULL,
	"direction" text NOT NULL,
	"amount" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"counterparty" text,
	"source" text DEFAULT 'chain' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokenomics_transaction_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"bucket_id" text,
	"tx_hash" text NOT NULL,
	"output_index" integer,
	"category" text NOT NULL,
	"amount" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tokenomics_anchor_record" ADD CONSTRAINT "tokenomics_anchor_record_project_id_tokenomics_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tokenomics_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_bucket" ADD CONSTRAINT "tokenomics_bucket_project_id_tokenomics_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tokenomics_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_controlled_wallet" ADD CONSTRAINT "tokenomics_controlled_wallet_project_id_tokenomics_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tokenomics_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_controlled_wallet" ADD CONSTRAINT "tokenomics_controlled_wallet_bucket_id_tokenomics_bucket_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."tokenomics_bucket"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_project" ADD CONSTRAINT "tokenomics_project_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_token_movement" ADD CONSTRAINT "tokenomics_token_movement_project_id_tokenomics_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tokenomics_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_token_movement" ADD CONSTRAINT "tokenomics_token_movement_bucket_id_tokenomics_bucket_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."tokenomics_bucket"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_transaction_tag" ADD CONSTRAINT "tokenomics_transaction_tag_project_id_tokenomics_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tokenomics_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokenomics_transaction_tag" ADD CONSTRAINT "tokenomics_transaction_tag_bucket_id_tokenomics_bucket_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."tokenomics_bucket"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tokenomics_anchor_project_idx" ON "tokenomics_anchor_record" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokenomics_anchor_project_version_unq" ON "tokenomics_anchor_record" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "tokenomics_bucket_project_idx" ON "tokenomics_bucket" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tokenomics_wallet_project_idx" ON "tokenomics_controlled_wallet" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tokenomics_wallet_bucket_idx" ON "tokenomics_controlled_wallet" USING btree ("bucket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokenomics_wallet_project_address_unq" ON "tokenomics_controlled_wallet" USING btree ("project_id","address");--> statement-breakpoint
CREATE UNIQUE INDEX "tokenomics_project_slug_unq" ON "tokenomics_project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tokenomics_project_owner_idx" ON "tokenomics_project" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tokenomics_movement_project_idx" ON "tokenomics_token_movement" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tokenomics_movement_bucket_idx" ON "tokenomics_token_movement" USING btree ("bucket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tokenomics_movement_project_tx_dir_unq" ON "tokenomics_token_movement" USING btree ("project_id","tx_hash","direction");--> statement-breakpoint
CREATE INDEX "tokenomics_tag_project_idx" ON "tokenomics_transaction_tag" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tokenomics_tag_tx_idx" ON "tokenomics_transaction_tag" USING btree ("tx_hash");
