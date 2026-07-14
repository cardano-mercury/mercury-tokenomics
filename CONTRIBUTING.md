# Contributing

Thanks for taking a look. This is the proof of concept for the Catalyst Fund 13 project
"Mercury: Tokenomics Statements", so the shape of the work is set by `docs/prd.md` (what and why) and
`docs/design.md` (how). Read `docs/design.md` before proposing an architectural change; it is the
source of truth for the data model, the utilization semantics, the vesting math, and the build
phases.

## Getting set up

`README.md` has the full setup. In short:

```sh
npm install
cp .env.example .env          # then fill it in
npm run db:migrate
npm run db:seed               # optional: two demo projects to explore
npm run dev
```

`@cardano-mercury/core` comes from npm, so you do not need the other Mercury repositories checked
out.

## The gate

Everything below runs in CI on every pull request, so run it before you push:

```sh
npm run lint      # Prettier, then ESLint
npm run check     # svelte-check
npm test          # Vitest
npm run build     # must succeed with no .env present
```

That last one is not a formality. SvelteKit's postbuild step imports every server module, so anything
done at import time runs during the build. The database client and Better Auth are therefore
constructed lazily, and the build must work with no environment at all, because the Docker build has
none. If you add a server module that connects to something at module scope, the build will break in
CI and not on your machine.

## What a change needs

- **Tests.** The happy path, the unhappy paths (invalid input, boundaries, error states), and a
  regression test for any bug being fixed. The domain modules under `src/lib/tokenomics` are pure and
  should stay that way, which is what makes them cheap to test.
- **Documentation.** If you change a surface someone uses (a route, a flow, a command, an environment
  variable, a public module), update the docs in the same commit. End-user instructions live in
  `docs/usage.md`, the technical design in `docs/design.md`, developer setup in `README.md`.
  Documentation drift is treated as an incomplete change.
- **A version bump.** Semantic Versioning. While the project is below 1.0, a feature bumps the minor
  and a fix bumps the patch. CI rejects a pull request whose version is not above `main`'s.
- **A change fragment**, not an edit to `CHANGELOG.md`. Add one file under `.changes/unreleased/`:

  ```markdown
  ---
  type: Fixed
  ---

  Vesting no longer rounds a bucket's final month down to zero.
  ```

  One file per change, so open pull requests never conflict over the changelog. `.changes/README.md`
  explains it. The fragments are folded into `CHANGELOG.md` at release time.

## Style

- Prettier and ESLint decide formatting; do not argue with them.
- Comments state what a function does and why it exists. No changelog-style comments ("previously
  this did X"), no exposition. Git history is the record of how code evolved.
- In documentation: no em dashes, no arrow characters, no horizontal rules, and do not number section
  headings (it breaks links when the order changes).

## Pull requests

Branch off `main`, open a pull request against `main`. `main` is protected: it takes no direct
pushes, and a pull request needs a green CI run and a review before it can merge.

Keep a pull request to one coherent change. If you are fixing a bug and tidying the surrounding code,
those are two pull requests, or at least two commits with honest messages.

## Reporting things

- **A security problem:** do not open an issue. Follow `SECURITY.md`.
- **A bug or a feature idea:** open an issue. There are templates.

## License

By contributing you agree that your contribution is licensed under the Apache License 2.0, the same
as the rest of the project. See `LICENSE`.
