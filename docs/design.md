# Mercury: Tokenomics Statements, Technical Design

This document describes the architecture and data model for the proof of concept. It is the companion to `prd.md`. The PRD says what and why; this says how.

## Summary

The tool lets a project declare its intended tokenomics (buckets, allocations, cliffs, vesting schedules) and anchor that declaration on-chain so it cannot be quietly changed later. It then walks the project's controlled wallets on the Cardano ledger, computes how the tokens have actually moved, and presents a comparison of intended schedule versus actual distribution, both as time-series curves and as a current snapshot. Anyone can review a participating project's statement without an account.

## Stack

- SvelteKit (TypeScript) for the full-stack app, server routes and form actions on the same deployment.
- MeshJS for wallet connection, CIP-8 signing, and building the on-chain anchoring transaction.
- Koios as the chain indexer for balances and transaction history, network-selectable.
- The shared Postgres database (the same instance the other Mercury apps use) via Drizzle ORM, for project profiles, drafts, bucket and wallet definitions, manual transaction tags, and cached token movements. Tokenomics' own tables are prefixed `tokenomics_` in the shared public schema, and it keeps its own Drizzle migration journal.
- Authentication and the shared user schema come from `@cardano-mercury/core`. Better Auth provides email and password or magic link, with TOTP two-factor. Because the apps share one database, one secret, and a parent-domain cookie, a session on either app is valid on both (single sign-on). The `user`/`session`/`account`/`verification`/`two_factor` tables are owned by core; tokenomics foreign-keys to `user` but does not create or migrate those tables.
- Dependency-free SVG components for the vesting and distribution charts.

Network is configurable through environment, defaulting to Preprod for development and demo. Mainnet is a config flip.

## Two layers of identity

Account identity and wallet control are deliberately separate.

An account is a person or team operating the tool, authenticated by Better Auth (email plus password or magic link, optional TOTP). An account owns project profiles.

Wallet control is proven cryptographically and independently of login. To attach a controlled wallet to a project, the operator produces a CIP-8 signature from that wallet over a server-issued challenge. One account can prove control of many wallets, and the same key that proves control is the key that signs the anchoring transaction. This keeps "who is editing" separate from "which wallets this project can legitimately speak for".

## Data model

All money amounts are stored as integer base units (no floats) to avoid rounding drift. Times are stored as UTC timestamps.

Account, session, and related auth tables are managed by Better Auth.

Project: owner account, display name, URL slug, network, draft or published status (drafts are private to the owner), token policy id, token asset name, decimals, total supply, the token generation or sale date that anchors schedules (call it T0), and free-form description and links.

Bucket: belongs to a project. Name, allocation as base units (and derived percent of supply), cliff in months, vesting length in months, vesting type (linear, cliff-based, accelerated, custom), an optional first-unlock or lump-sum amount released at T0, an optional per-bucket T0 override, and a custom curve payload for the custom type. Display order is stored so the editor and charts stay stable.

ControlledWallet: belongs to a project, optionally assigned to one bucket. Stores the payment or stake address, a human label, the CIP-8 ownership proof and the time it was verified. The set of all controlled wallets for a project is the classification boundary: any transfer landing inside that set is internal, anything leaving it is external.

TransactionTag: a manual classification attached to an on-chain transaction (by tx hash, optionally output index) for a project. Carries a category (for example CEX listing, team payment, liquidity provision, treasury move), an optional bucket association, an amount, and a note. Tags refine the automatically computed statement.

AnchorRecord: one row per on-chain anchoring. Stores the project, the canonical payload hash that was published, the metadata label used, the transaction hash, the network, a monotonic version number, and the anchored time. Lets the UI show "declaration anchored at version N on date D" and detect when the current draft has drifted from the last anchored version.

## Utilization semantics

A bucket's utilization is its net external outflow: policy tokens that left the bucket's controlled wallets to addresses outside the project's full controlled set. Transfers between the project's own wallets are internal and do not count, so rebalancing does not inflate the statement. The full controlled-address set is required to classify each movement, which is why wallet declaration is a prerequisite for an accurate statement.

The controlled set is keyed by staking credential, not by literal address. A Cardano wallet rotates payment addresses while keeping one stake key, so an address is treated as the project's when it is declared or when it shares a declared address's stake key. Chain history is fetched by stake credential as well as by address, since address-scoped history never returns a transaction that touched only a rotated sibling.

Attribution to a bucket is deliberately stricter than membership. Several buckets may sit behind one stake key (one wallet, a different payment address per bucket), so a sibling address is attributed to a bucket only when its stake key has exactly one bucket behind it. Otherwise the outflow is recorded as unassigned rather than guessed at, since guessing would silently merge distinct buckets.

On top of the automatic computation, operators can tag transactions to explain or reclassify movements. Tags never silently override the on-chain numbers; they annotate them and can split a raw outflow into labeled categories for the statement.

## Vesting math

The schedule for a bucket is a pure function of time. Given allocation A, T0, optional first-unlock F, cliff C months, vesting length V months, and type, the intended cumulative unlocked amount at time t is computed deterministically:

- Before the cliff, only the first-unlock amount F is considered released.
- Linear: after the cliff, the remaining A minus F releases evenly across V months.
- Cliff-based: nothing beyond F until the cliff completes, then steady release across V.
- Accelerated: release rate increases as t approaches and passes the cliff, per a defined curve.
- Custom: release follows the stored custom curve payload.

This logic lives in a pure, dependency-free module so it can be unit tested in isolation and reused by both the chart code and the anchoring payload builder.

## Comparison engine

For a project, the engine produces, per bucket and in aggregate:

- The intended cumulative-unlocked curve over time from the vesting math.
- The actual cumulative-distributed curve over time, built by walking transaction history for the bucket's controlled wallets from Koios, classifying each policy-token movement as internal or external against the controlled set, and accumulating external outflow, then applying any manual tags.
- A current snapshot: for each bucket, intended-unlocked-to-date versus actual-distributed-to-date, and the gap.

The engine is pure given its inputs (schedule definitions plus a normalized list of classified movements), so chain fetching is a separate concern that feeds it.

## On-chain anchoring

The declaration (project identity, T0, buckets with allocations and schedules, and the controlled-address set) is serialized to a canonical, deterministically ordered JSON and hashed. Because Cardano metadata constrains string values to 64 bytes, the on-chain record stores a compact object under a chosen metadata label: a version, the project slug, the payload hash, and a URI where the full canonical payload can be fetched. Verification is recomputing the hash of the fetched payload and comparing it to the on-chain value, which makes tampering detectable without trusting the server.

The anchoring transaction is built with MeshJS (the tx3 tooling in this environment can assist) and signed by a wallet the project has already proven it controls. Each anchoring increments the version and writes an AnchorRecord.

## Application structure

Server-only modules under `src/lib/server`: the Drizzle schema and client, the Better Auth setup, the Koios client, and the anchoring payload and verification helpers.

Pure domain modules under `src/lib/tokenomics`: types, the vesting schedule math, and the comparison engine. No SvelteKit or network imports, fully unit tested with Vitest.

Shared UI under `src/lib/components`, including the LayerCake chart components for curves and snapshots, and the CIP-8 challenge-and-verify helper for wallet proofs.

Routes: a public project directory and per-project public statement pages; the auth pages; and an authenticated dashboard for creating and editing projects, declaring and proving wallets, managing buckets and schedules, tagging transactions, and anchoring.

## Build phases

Foundation: scaffold SvelteKit and TypeScript, wire Drizzle and SQLite, stand up Better Auth, and lay down the base layout and navigation.

Project data: schema and migrations, project create and edit, bucket and schedule editor, wallet declaration with CIP-8 ownership proof.

Chain integration: the Koios client, fetching balances and full token-movement history, and internal-versus-external classification against the controlled set.

Comparison and visualization: the vesting math and comparison engine with tests, LayerCake curve and snapshot charts, and the public statement page.

Anchoring: canonical payload and hashing, the metadata transaction via MeshJS, the verify flow and a status badge, and AnchorRecord tracking.

Manual classification: the transaction tagging UI and its integration into the statement.

Polish: seeded sample Preprod projects, the public directory, and developer and user documentation.

## Out of scope for the POC

Per the PRD: complex UTxO accounting, oracle integration, automated multi-source ingestion beyond the controlled wallets, and any assurance of correctness. The statement is a tool, not an audit.
