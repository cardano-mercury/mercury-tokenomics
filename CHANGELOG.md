# Changelog

All notable changes to this project are documented here. The format is based on Keep a Changelog, and the project adheres to Semantic Versioning. While the version is below 1.0, the minor number increases for new features and the patch number for fixes and internal changes. The 1.0 release is reserved for the proof of concept delivery.

## [Unreleased]

## [0.10.0] - 2026-06-30

### Changed

- Migrated the database from SQLite to the shared Postgres database used by the other Mercury apps. Tokenomics' own tables are now Postgres tables prefixed `tokenomics_` in the shared public schema, with their own migration journal (`__drizzle_migrations_tokenomics`) so histories do not collide.
- Authentication now comes from the shared `@cardano-mercury/core` package. The Better Auth `user`/`session`/`account`/`verification`/`two_factor` tables are shared, so an account works across the Mercury apps (single sign-on with a shared secret and a parent-domain cookie). Email/password and two-factor come from core; magic link and its email transport stay app-side.
- Bumped `better-auth` to `^1.6.23` to match the other apps, removed `better-sqlite3`, added `postgres`. The project directory search uses `ilike` for case-insensitive matching on Postgres.

### Notes

- Local development uses the shared Postgres from financials' compose (`localhost:5544/local`). For SSO, set `BETTER_AUTH_SECRET` identically across apps and `COOKIE_DOMAIN` (e.g. `.cardano-mercury.com`) in production.
- mercury-core is consumed via a `file:` link; its peer `drizzle-orm` is deduped (Vite `resolve.dedupe` and a tsconfig alias) so the app and core share one instance.

## [0.9.0] - 2026-06-29

### Added

- Search, network filtering, and pagination on the public projects directory. State lives in the URL (`q`, `network`, `page`) so results are shareable, with a result count and previous/next controls.

## [0.8.0] - 2026-06-29

### Added

- Project draft and published status. New projects start as drafts that are private to their owner. Owners can preview the full statement (shown with a draft banner) and publish or unpublish from the project page. Only published projects appear in the public directory and can be viewed or exported by others.

## [0.7.0] - 2026-06-29

### Added

- Seed script (`npm run db:seed`) that loads two demo projects (Helios Protocol and Acme DAO) with buckets, wallets, and movements so the app is explorable immediately. Idempotent and re-runnable.

## [0.6.0] - 2026-06-29

### Added

- On-chain anchoring flow: an anchor page shows the canonical declaration, its blake2b-256 hash, and the metadata to publish under the Mercury metadata label, then records the anchoring transaction with an automatic version counter.
- Declaration verification on the public statement: the page recomputes the declaration hash and shows a verified badge when it matches the anchored hash, or flags that the declaration has changed since anchoring.
- Statement export to an .xlsx workbook.
- Declaration payload builder and export-row helpers, with unit tests.

## [0.5.0] - 2026-06-29

### Added

- Public project directory and per-project tokenomics statement showing Promised versus Delivered: per-bucket bars, promised and delivered distribution donuts, an adherence-over-time line chart, a date scrubber, and overall totals.
- `token_movement` store plus dashboard tools to sync external outflows from Koios and to record movements manually, feeding the Delivered side of the statement.
- Koios chain client with pure transaction-netting logic, the statement assembler that maps stored data onto the comparison engine, and chart-data helpers, all with unit tests.

### Changed

- Charts render as lightweight, dependency-free SVG components for the proof of concept. LayerCake remains the intended option if richer interactions are needed later.

## [0.4.0] - 2026-06-29

### Added

- Project management in the dashboard: create a project (name, policy id, asset name, decimals, total supply, token generation date, network), edit its details, and manage its buckets and controlled wallets.
- Bucket editor with allocation, first unlock, cliff, vesting length, and vesting type, with a running allocated-versus-supply total.
- Controlled wallet declaration with optional label and bucket assignment. Wallets start unverified; cryptographic ownership proof is a later milestone.
- Pure project and bucket validation with slug generation and base-unit parsing (`src/lib/projects/validation.ts`), with unit tests.
- Pure movement classification module (`src/lib/tokenomics/classify.ts`) that separates internal transfers from external outflows against the controlled set, with unit tests.
- Pure on-chain anchoring module (`src/lib/tokenomics/anchor.ts`): deterministic declaration canonicalization, blake2b-256 hashing, metadata construction, and verification, with unit tests.

## [0.3.0] - 2026-06-29

### Added

- Account authentication with Better Auth: email and password sign up and sign in, passwordless magic link (dev transport logs the link to the server console), and TOTP two-factor authentication with backup codes.
- Auth routes: signup, login (with a magic-link option), the two-factor sign-in challenge, a protected dashboard listing the account's projects, and a security page to enable or disable two-factor.
- Pure auth input validation (`src/lib/auth/validation.ts`) with unit tests.
- Swappable outbound email module (`src/lib/server/email.ts`).
- `two_factor` table and the user two-factor column via a new migration.

## [0.2.0] - 2026-06-29

### Added

- Tailwind CSS with the full Mercury design system from the style guide: theme tokens (colors, fonts, radii, shadows), light and dark modes via a data-theme attribute, and reusable component classes (cards, buttons, inputs).
- Geist and JetBrains Mono web fonts and the Lucide icon set.
- Application shell with header navigation, a theme toggle, a footer, and a sign-out endpoint.
- Marketing landing page.
- Shared display formatting utilities (`src/lib/format.ts`) for amounts, addresses, dates, and percentages, with 12 unit tests.

## [0.1.0] - 2026-06-29

### Added

- Technical design document (`docs/design.md`) covering architecture, data model, utilization semantics, vesting math, on-chain anchoring, and build phases.
- SvelteKit and TypeScript application scaffold with the Node adapter, Drizzle ORM over SQLite (`better-sqlite3`), Better Auth (password base), Vitest, ESLint, and Prettier.
- Domain data model in `src/lib/server/db/schema.ts`: project, bucket, controlled wallet, transaction tag, and anchor record tables with relations and an initial migration. Token amounts are stored as decimal-string base units; timestamps as epoch milliseconds.
- Pure tokenomics engine in `src/lib/tokenomics`: vesting math for linear, monthly-stepped cliff, front-loaded accelerated, and interpolated custom schedules, plus the intended-versus-actual comparison engine. Covered by 27 unit tests across happy paths, boundaries, degenerate schedules, attribution, and aggregation.
- Project documentation: `README.md` developer setup, `CHANGELOG.md`, and `docs/usage.md` user guide.
