# Changelog

All notable changes to this project are documented here. The format is based on Keep a Changelog, and the project adheres to Semantic Versioning. While the version is below 1.0, the minor number increases for new features and the patch number for fixes and internal changes. The 1.0 release is reserved for the proof of concept delivery.

## [Unreleased]

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
