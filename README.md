# Mercury: Tokenomics Statements

A Cardano tool that compares a project's declared tokenomics (buckets, allocations, cliffs, and vesting schedules) against the actual on-chain behavior of the wallets controlling those tokens, and anchors the declaration on-chain so it can be independently verified.

This is the proof of concept for Catalyst Fund 13, Milestone 2. See `docs/prd.md` for the product requirements and `docs/design.md` for the technical design.

## Tech

SvelteKit and TypeScript, Drizzle ORM over the shared Postgres database, authentication and the shared user schema from `@cardano-mercury/core` (Better Auth, single sign-on across the Mercury apps), Koios for chain data, MeshJS for on-chain anchoring, and dependency-free SVG charts. The app targets a self-hosted Node deployment and defaults to the Preprod network.

The app shares one Postgres database with the other Mercury apps. Its own tables are prefixed `tokenomics_`; the `user`/`session`/`account`/`verification`/`two_factor` tables are the shared, core-owned auth tables. See `docs/design.md` and `mercury-core/docs/migrating-tokenomics-to-core.md`.

## Getting started

Install dependencies and set up the environment (`@cardano-mercury/core` comes from npm, so no sibling checkout is needed):

```sh
npm install
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` to the shared Postgres (default `postgres://root:mysecretpassword@localhost:5544/local`), `ORIGIN` (for example `http://localhost:5173`), `BETTER_AUTH_SECRET` (must match the other Mercury apps for SSO), and `COOKIE_DOMAIN` (blank locally). Set `PORT` for the built app (`npm run build && node build`, via adapter-node) to a value distinct from the other Mercury apps when co-hosting on one machine; it defaults to 3000 if unset, the same as mercury-financials.

Start the shared Postgres (from the financials repo's compose), apply migrations, optionally seed, and run:

```sh
( cd ../mercury-financials && npm run db:start )   # shared Postgres + Redis
npm run db:migrate
npm run db:seed   # optional: two demo projects to explore
npm run dev
```

The shared auth tables are owned and created by core/financials; tokenomics' migrations only create its own `tokenomics_` tables.

## Common commands

- `npm run dev` runs the dev server, `npm run build` and `npm run preview` produce and serve a production build.
- `npm test` runs unit tests, `npm run check` type-checks, `npm run lint` and `npm run format` handle code style.
- `npm run db:generate` then `npm run db:migrate` create and apply schema migrations. `npm run db:studio` opens Drizzle Studio. `npm run db:seed` loads demo projects.

There is deliberately no `db:push`. On the shared database, `drizzle-kit push` proposes dropping another app's migration-journal sequence (`tablesFilter` covers tables but not sequences), so it is not safe to run.

## Deployment

The production stack that runs tokenomics and financials together behind Caddy lives in mercury-core under `deploy/`. This repo owns only its own image.

`Dockerfile` provides a `runner` target (the server, on port 3000) and a `migrate` target (a one-shot that applies only tokenomics' `tokenomics_*` tables). It is an ordinary single-context build, since core comes from npm:

```sh
docker build --target runner -t mercury-tokenomics .
```

The build needs no environment: the database client and Better Auth are constructed on first use, not at import, so `npm run build` works with no `.env` present (SvelteKit's postbuild analyse imports every server module, so a module-scope connection would otherwise make the build demand production secrets).

Migrations must run in order on the shared database: core's shared auth tables first, then tokenomics'. `tokenomics_project.owner_id` foreign-keys to `user`, so tokenomics' migration fails outright if core has not run.

```sh
DATABASE_URL=... npx @cardano-mercury/core migrate   # shared auth tables (core owns these)
DATABASE_URL=... npm run db:migrate:deploy           # tokenomics_* tables
```

`/healthz` reports readiness by round-tripping the database and is what the container healthcheck probes.

### Published images

`.github/workflows/release.yml` runs the gate (lint, `check`, tests) and then publishes both images to GHCR, so the demo host pulls rather than builds. Building on the host would need several GB of RAM for the SvelteKit build and drag a dev toolchain onto the production box.

| image                                                | target    | contents                       |
| ---------------------------------------------------- | --------- | ------------------------------ |
| `ghcr.io/cardano-mercury/mercury-tokenomics`         | `runner`  | the server                     |
| `ghcr.io/cardano-mercury/mercury-tokenomics-migrate` | `migrate` | migrations and the seed script |

Two images, because the runner installs production dependencies only: it carries neither `drizzle-orm` nor `scripts/`, so it cannot migrate or seed itself. The stack runs the migrate image as a one-shot before the app starts, and the same image seeds:

```sh
docker compose run --rm --entrypoint sh tokenomics-migrate -c 'node scripts/seed.mjs'
```

A push to `main` publishes a rolling `main` tag; a `v*` tag publishes the semver plus `latest`. Both also get `sha-<short>` so a deploy can be pinned to a commit. **GHCR packages are private by default and both must be made public once**, or every pull needs a token; the setting is on the package, not the repo.

## Contributing

See `CONTRIBUTING.md`. In short: `main` is protected and takes no direct pushes, so work goes through a pull request, which must pass CI (lint, types, tests, a no-environment build, and both container images), bump the version, and add a change fragment under `.changes/unreleased/` rather than editing `CHANGELOG.md`.

Security problems go through private reporting, never a public issue. See `SECURITY.md`.

## License

Apache License 2.0, Copyright 2026 Cardano Mercury, Inc. See `LICENSE`.

Contributions are accepted under the same license, as set out in `CONTRIBUTING.md`.
