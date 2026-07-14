-- Give every foreign key an explicit, short name.
--
-- Postgres truncates identifiers at 63 characters. Drizzle derives a foreign key name as
-- {table}_{column}_{reftable}_{refcolumn}_fk, which with the `tokenomics_` prefix produced
--   tokenomics_controlled_wallet_project_id_tokenomics_project_id_fk   (64 chars)
-- The server silently stored that as ..._project_id_f (63 chars, trailing "k" cut), so the name
-- drizzle expected never matched the name in the database and every diff proposed recreating the
-- constraint. Renaming (rather than drop and re-add) keeps the constraint enforced throughout and
-- avoids a full re-validation scan.
--
-- Each rename is guarded, so this applies cleanly both to an existing database and to a fresh one
-- that has just run 0000 (which creates, and truncates, the same names).
DO $$
DECLARE
	renames text[][] := ARRAY[
		['tokenomics_project', 'tokenomics_project_owner_id_user_id_fk', 'tokenomics_project_owner_fk'],
		['tokenomics_bucket', 'tokenomics_bucket_project_id_tokenomics_project_id_fk', 'tokenomics_bucket_project_fk'],
		-- Stored truncated at 63 characters; the source name in 0000 was 64.
		['tokenomics_controlled_wallet', 'tokenomics_controlled_wallet_project_id_tokenomics_project_id_f', 'tokenomics_wallet_project_fk'],
		['tokenomics_controlled_wallet', 'tokenomics_controlled_wallet_bucket_id_tokenomics_bucket_id_fk', 'tokenomics_wallet_bucket_fk'],
		['tokenomics_transaction_tag', 'tokenomics_transaction_tag_project_id_tokenomics_project_id_fk', 'tokenomics_tag_project_fk'],
		['tokenomics_transaction_tag', 'tokenomics_transaction_tag_bucket_id_tokenomics_bucket_id_fk', 'tokenomics_tag_bucket_fk'],
		['tokenomics_anchor_record', 'tokenomics_anchor_record_project_id_tokenomics_project_id_fk', 'tokenomics_anchor_project_fk'],
		['tokenomics_token_movement', 'tokenomics_token_movement_project_id_tokenomics_project_id_fk', 'tokenomics_movement_project_fk'],
		['tokenomics_token_movement', 'tokenomics_token_movement_bucket_id_tokenomics_bucket_id_fk', 'tokenomics_movement_bucket_fk']
	];
	r text[];
BEGIN
	FOREACH r SLICE 1 IN ARRAY renames LOOP
		IF EXISTS (
			SELECT 1 FROM pg_constraint
			WHERE conname = r[2] AND conrelid = r[1]::regclass
		) THEN
			EXECUTE format('ALTER TABLE %I RENAME CONSTRAINT %I TO %I', r[1], r[2], r[3]);
		END IF;
	END LOOP;
END $$;
