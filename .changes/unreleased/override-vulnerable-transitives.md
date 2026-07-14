---
type: Security
bump: patch
---

Pinned five vulnerable transitive dependencies with npm `overrides`, taking `npm audit` from
twenty-one advisories, one of them high, to zero. The high was `undici@5.29.0`, reached through
`@meshsdk/core`.

There is no upgrade path out of it: `@meshsdk/core` and `drizzle-kit` are both already on their latest
release, and `npm audit fix` offers to downgrade them instead. The pinned packages are `undici`,
`ip-address` and `esbuild`, plus `cookie` (reached through SvelteKit) and `uuid` (through exceljs).

Each override was exercised against the code that depends on it: address parsing under `undici` 6
returns identical results, the auth session still round-trips under `cookie` 0.7, the xlsx export still
produces a valid workbook under `uuid` 11, and `drizzle-kit` still reads the schema under `esbuild`
0.25.
