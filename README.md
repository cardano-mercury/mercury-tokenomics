# Mercury: Tokenomics Statements

A Cardano tool that compares a project's declared tokenomics (buckets, allocations, cliffs, and vesting schedules) against the actual on-chain behavior of the wallets controlling those tokens, and anchors the declaration on-chain so it can be independently verified.

This is the proof of concept for Catalyst Fund 13, Milestone 2. See `docs/prd.md` for the product requirements and `docs/design.md` for the technical design.

## Tech

SvelteKit and TypeScript, Drizzle ORM over SQLite, Better Auth for accounts, Koios for chain data, MeshJS for on-chain anchoring, and dependency-free SVG charts. The app targets a self-hosted Node deployment and defaults to the Preprod network.

## Getting started

Install dependencies and set up the environment:

```sh
npm install
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL` (defaults to `local.db`), `ORIGIN` (for example `http://localhost:5173`), and a high-entropy `BETTER_AUTH_SECRET`.

Create the database and run the app:

```sh
npm run db:migrate
npm run dev
```

## Common commands

- `npm run dev` runs the dev server, `npm run build` and `npm run preview` produce and serve a production build.
- `npm test` runs unit tests, `npm run check` type-checks, `npm run lint` and `npm run format` handle code style.
- `npm run db:generate` then `npm run db:migrate` create and apply schema migrations. `npm run db:studio` opens Drizzle Studio.
- `npm run auth:schema` regenerates the Better Auth tables after changing auth config.

## License

Apache 2.0. See `LICENSE`.
