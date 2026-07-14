---
type: Security
bump: patch
---

Pinned five vulnerable transitive dependencies with npm `overrides`, taking `npm audit` from
twenty-one advisories (one **high**) to **zero**. The high was `undici@5.29.0`, pulled in by
`@meshsdk/core`, which is a peer dependency of `@cardano-mercury/core` and therefore installed in this
tree rather than core's. npm honours `overrides` only from the root project, so core pinning it
protects core and does nothing for us.

There is no upgrade path: `@meshsdk/core` and `drizzle-kit` are both already on their latest release,
and `npm audit fix` proposes _downgrading_ them, which is worse than the problem.

Beyond the three that core asked for (`undici`, `ip-address`, `esbuild`), two more were needed for a
clean audit, because they come from packages core does not have: `cookie` (via SvelteKit) and `uuid`
(via exceljs).
