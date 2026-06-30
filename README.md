# Mercury: Tokenomics Statements

A Cardano tool that compares a project's declared tokenomics (buckets, allocations, cliffs, and vesting schedules) against the actual on-chain behavior of the wallets controlling those tokens, and anchors the declaration on-chain so it can be independently verified.

This is the proof of concept for Catalyst Fund 13, Milestone 2. See `docs/prd.md` for the product requirements and `docs/design.md` for the technical design.

## Tech

SvelteKit and TypeScript, Drizzle ORM over the shared Postgres database, authentication and the shared user schema from `@cardano-mercury/core` (Better Auth, single sign-on across the Mercury apps), Koios for chain data, MeshJS for on-chain anchoring, and dependency-free SVG charts. The app targets a self-hosted Node deployment and defaults to the Preprod network.

The app shares one Postgres database with the other Mercury apps. Its own tables are prefixed `tokenomics_`; the `user`/`session`/`account`/`verification`/`two_factor` tables are the shared, core-owned auth tables. See `docs/design.md` and `mercury-core/docs/migrating-tokenomics-to-core.md`.

## Getting started

Install dependencies and set up the environment (`@cardano-mercury/core` is linked locally via `file:../mercury-core`, so build it first if needed with `npm run build` in that repo):

```sh
npm install
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` to the shared Postgres (default `postgres://root:mysecretpassword@localhost:5544/local`), `ORIGIN` (for example `http://localhost:5173`), `BETTER_AUTH_SECRET` (must match the other Mercury apps for SSO), and `COOKIE_DOMAIN` (blank locally).

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

## License

Apache 2.0. See `LICENSE`.
