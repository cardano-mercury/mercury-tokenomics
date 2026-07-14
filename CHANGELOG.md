# Changelog

All notable changes to this project are documented here. The format is based on Keep a Changelog, and the project adheres to Semantic Versioning. While the version is below 1.0, the minor number increases for new features and the patch number for fixes and internal changes. The 1.0 release is reserved for the proof of concept delivery.

## [Unreleased]

## [0.17.0] - 2026-07-14

### Added

- Automated releases through the organisation's Mercury Release Bot. CI going green on `development`
  opens a `Release vX.Y.Z` pull request against `main`, assembled from the accumulated change fragments;
  merging it publishes the images to GHCR, tags the version, and cuts the GitHub release. A
  `Sync development` pull request follows, bringing the release back to `development` so the next one
  does not ship the same fragments twice.

  The bot authenticates as a GitHub App rather than with `GITHUB_TOKEN`. That is load-bearing: GitHub
  does not let a workflow run created with `GITHUB_TOKEN` trigger further workflow runs, so a release
  pull request opened that way would get no checks at all, and `main` requires them, so it could never
  merge. Publishing is now triggered by CI succeeding on `main` rather than by a hand-pushed tag, and it
  refuses to publish a version that is already tagged.

### Fixed

- The generated `coverage/` report is no longer committed to the repository. Twenty-nine files of it had
  been added by a `git add -A` when coverage was first enabled, and ESLint was linting them.

## [0.16.1] - 2026-07-14

### Fixed

- The migrate image no longer carries the repository's CI tooling. It copied `scripts/` wholesale, which
  put the release and audit scripts into a production image, and the new secret audit failed the build
  over it: `audit-image.sh` names the very keys it scans for. It now copies only the two scripts it
  runs, `migrate.mjs` and `seed.mjs`.

## [0.16.0] - 2026-07-14

### Added

- Continuous integration, split from publishing. `ci.yml` is the quality gate: it runs on every pull
  request and on pushes to `main`, checks lint, types, tests and a no-environment production build, and
  builds both container images without pushing them, so a broken Dockerfile fails the pull request
  rather than the release. `release.yml` runs only on a `v*` tag and publishes the images to GHCR; it
  reuses the CI workflow as its first job, so a tag cannot ship an image that never passed the gate.
- Enforced coverage thresholds (`npm run test:coverage`, run in CI). They sit at the level the suite
  currently reaches, so coverage cannot regress. The denominator is the logic-bearing modules; the
  drizzle schema, barrels, type files, configuration and thin re-export seams are excluded, since a
  percentage over those measures nothing.
- An `.editorconfig`, matching `.prettierrc` exactly, and an explicit `tabWidth` in the Prettier config.
  Prettier reads `.editorconfig` and maps `indent_size` onto `tabWidth`, so the two silently fight when
  they disagree: an editor or agent that has not loaded Prettier indents one way and Prettier reformats
  the other way on every save. Verified that adding it reformats zero files.
- Community health files for public contribution: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor
  Covenant 2.1), `SECURITY.md` with private vulnerability reporting and an explicit scope, `CODEOWNERS`,
  issue and pull request templates, and a Dependabot configuration that deliberately excludes
  `better-auth` and `@cardano-mercury/core`, which must be bumped in lockstep across the Mercury apps.

  Dependabot runs weekly with a cooldown so a release must be 14 days old (major) or 7 days old (minor)
  before it is proposed, a low cap on open pull requests, and groups by blast radius: security fixes
  alone, majors alone, and routine minor and patch bumps batched per dependency type.

- Two guards on what gets published. The release workflow refuses to publish when the git tag and
  `package.json` disagree, so a tag on the wrong commit cannot ship an image labelled with a version the
  code does not claim. CI audits both images for secrets rather than assuming they are clean: it counts
  matches instead of piping `grep` into `head` (which succeeds whatever it found), and it matches
  sensitive keys rather than every long-looking value, so it does not cry wolf over a dependency's
  README. Verified against a deliberately poisoned image.
- A pull request gate for versioning and the changelog. Every pull request must describe itself with one
  new file under `.changes/unreleased/`, carrying a Keep a Changelog type and the semver impact. One
  file per change, so open pull requests never conflict over `CHANGELOG.md`.

### Changed

- The Apache 2.0 license now carries its copyright attribution (Copyright 2026 Cardano Mercury, Inc.)
  rather than the unfilled `[yyyy] [name of copyright owner]` placeholder, and `package.json` declares
  the license, the author, and the repository.
- The version and the changelog are now outputs of a release rather than inputs to a pull request. A
  pull request declares its semver impact with `bump:` in its change fragment and touches neither;
  `npm run release` consumes the fragments, computes the version from the highest bump among them, and
  writes the changelog. CI rejects a hand-edited version or changelog, and exempts the release pull
  request, which is the one thing that is supposed to do all three. Below 1.0 a breaking change raises
  the minor, which is how `0.x` says "this breaks you".

### Fixed

- The version and changelog gate no longer skips its own change-fragment check when the base branch has
  no `package.json` (a first release). It gated the diff on the file existing, so a first release saw no
  changed files at all and could never find its own fragments.

## [0.15.0] - 2026-07-13

### Fixed

- Utilization no longer counts a project's own address rotation as delivered tokens. A Cardano wallet
  rotates payment addresses while keeping one staking credential, so a project that declared
  `addr1...abc` still spends from and receives to sibling addresses under the same stake key. Those
  siblings were matched by literal string, so they read as outsiders, and moving tokens between a
  project's own addresses was booked as an external outflow. An address is now controlled when it is
  declared **or** when it shares a declared address's stake key (`ControlledSet`, using
  `rewardAddressOf` from `@cardano-mercury/core/cardano`, which parses offline with no chain call).
- The chain sync now queries Koios by stake credential (`/account_txs`) as well as by declared address
  (`/address_txs`). Address-scoped history alone never returns a transaction that touched only a
  sibling address, so classification could not see what it was never given. Addresses with no staking
  part (enterprise, script) still go through the address-scoped path.

### Notes

- **Bucket attribution deliberately does not follow the stake key.** Several buckets may legitimately
  sit behind one stake key (one wallet, a different payment address per bucket), so attributing a
  sibling by stake key would clump those buckets together. A declared address always uses its own
  bucket; an undeclared sibling resolves to a bucket only when its stake key has exactly one bucket
  behind it, and is left unassigned otherwise rather than guessed at.
- `@meshsdk/core` is now a declared dependency. It was already present as an auto-installed peer of
  `@cardano-mercury/core` and already shipped in the runtime image, so this adds nothing to the image;
  it just stops the app relying on a transitive package it never asked for.

## [0.14.0] - 2026-07-13

### Added

- Continuous integration and image publishing (`.github/workflows/release.yml`, the repo's first
  workflow). It runs the existing gate (lint, `check`, the test suite) and then pushes two images to
  GHCR: `mercury-tokenomics` (the server) and `mercury-tokenomics-migrate` (migrations and the seed
  script). A push to `main` publishes a rolling `main` tag, a `v*` tag publishes the semver plus
  `latest`, and both get a `sha-<short>` tag so a deploy can be pinned to a commit. The demo host can
  then pull instead of building, which is what let the VM shrink: a SvelteKit build wants several GB
  of RAM and a dev toolchain that has no business on a production box.

### Changed

- The `migrate` image is built from the base image rather than from the build stage, so it carries
  only the migration SQL, `scripts/`, and the two packages those scripts import, instead of the whole
  dev toolchain and the app build. **608 MB down to 175 MB**, the largest single thing the demo host
  pulls. It remains the seed image, and the runbook's seed command is unchanged.

## [0.13.0] - 2026-07-13

### Added

- Real SMTP delivery for magic-link sign-in, via nodemailer. Setting `SMTP_URL` sends the link as
  email; `MAIL_FROM` overrides the sender. The shared deploy stack in mercury-core sets `SMTP_URL`
  (pointing at a mailpit sink in its local dry run) and expects tokenomics to send, so the previous
  transport stub would have failed the magic-link path there. Verified end to end against a live
  SMTP server: the mail is delivered, and following the link issues a session and signs the account
  in. With `SMTP_URL` unset the behaviour is unchanged (console in development, option hidden in
  production).

## [0.12.0] - 2026-07-13

### Changed

- `@cardano-mercury/core` now comes from npm (`^0.2.1`) instead of a `file:../mercury-core` link, so
  no sibling checkout is needed to build. The link gave core its own `node_modules`, which meant two
  physical copies of `better-auth`/`@better-auth/core` and therefore two TypeScript identities for
  the same types. With one hoisted copy, the workarounds that duplication forced are all deleted: the
  `drizzle-orm` alias and `resolve.dedupe` in `vite.config.ts`, and the cast on the `svelteKitHandler`
  call in `hooks.server.ts`.
- The `Dockerfile` is now an ordinary single-context build (`docker build --target runner .`), rather
  than needing the parent directory holding every Mercury repo as its context.

### Fixed

- `npm run build` no longer requires production secrets. SvelteKit's postbuild analyse step imports
  every server module, so connecting the database and constructing Better Auth at module scope made
  the build demand a live `DATABASE_URL` and a real `BETTER_AUTH_SECRET`. It failed in a Docker
  build, where there is no `.env`, and passed locally only because one was sitting there. Both are
  now constructed on first use behind a proxy, so the build needs no environment and a missing
  variable surfaces on the first request that touches it, where it is actionable.

## [0.11.0] - 2026-07-13

### Added

- Production `Dockerfile` with a `runner` target (the server) and a `migrate` target (a one-shot).
  The build context is the parent directory holding every Mercury repo, because core is linked as
  `file:../mercury-core` and npm cannot resolve a path outside the build context. Feeds the shared
  deployment stack composed in mercury-core.
- `/healthz` readiness endpoint that round-trips the database, so a container that cannot reach the
  shared Postgres reports unhealthy rather than silently serving errors. The check is bounded by a
  timeout, because a probe that hangs cannot be told apart from a slow one.
- `npm run db:migrate:deploy` (`scripts/migrate.mjs`), applying migrations through drizzle-orm's
  runtime migrator so the production image needs neither drizzle-kit nor the TypeScript schema.
- `PROTOCOL_HEADER` and `HOST_HEADER` to `.env.example`. Behind a TLS-terminating proxy adapter-node
  needs these, or it builds absolute URLs from the internal address and Better Auth rejects its own
  callbacks as cross-origin.

### Fixed

- Silent schema drift on the shared database. Postgres truncates identifiers at 63 characters, and
  drizzle's derived foreign key name for `tokenomics_controlled_wallet` came to 64, so the server
  stored a truncated name that never matched the one drizzle expected and every diff proposed
  recreating the constraint. All nine foreign keys are now named explicitly and kept short, and a
  migration renames the existing constraints in place (a rename, so the constraint stays enforced
  and no re-validation scan is needed).
- A request no longer hangs when the database is unreachable: the postgres client now has a
  `connect_timeout`, where before it retried indefinitely.

### Removed

- The `db:push` script. `tablesFilter` covers tables but not sequences, so `drizzle-kit push`
  against the shared database proposes dropping another app's migration-journal sequence and would
  destroy its migration history.

### Changed

- Magic-link sign-in is now offered only where the link can be delivered: in development (printed to
  the server console) or once a mail transport is configured (`SMTP_URL`). With no transport in
  production the option is hidden and the action refuses a direct POST, instead of reporting that a
  link was sent when it was only written to the container's stdout. Email and password, and TOTP
  two-factor, are unaffected.
- Pinned `better-auth` to `~1.6.23` to match the exact version mercury-core pins. A version skew
  across the shared auth layer produces type errors that read as unrelated structural mismatches.

## [0.10.1] - 2026-07-13

### Changed

- Dropped the hand-rolled `PluginEndpoints` cast in `auth.ts`: core 0.1.0 makes `createAuth` generic
  over its plugins, so `auth.api.enableTwoFactor` / `verifyTOTP` / `disableTwoFactor` /
  `signInMagicLink` now infer directly without an `authApi` wrapper.
- Added a `PORT` variable to `.env.example` (default suggestion 3001) so tokenomics can be co-hosted
  on the same machine as mercury-financials without both binding adapter-node's default port 3000.

### Fixed

- `hooks.server.ts`: core 0.1.0's typed-plugins return value is not structurally assignable to what
  `better-auth/svelte-kit`'s `svelteKitHandler` expects for its `auth` parameter (a literal-tuple vs.
  plain-array mismatch on `$ERROR_CODES`). Added a narrow local cast to keep `npm run check` clean
  until core's fix lands; tracked as a TRD in mercury-core.

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
