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
- **A change fragment.** One new file under `.changes/unreleased/`, declaring what kind of change it
  is and what it does to the version:

  ```markdown
  ---
  type: Fixed
  bump: patch
  ---

  Vesting no longer rounds a bucket's final month down to zero.
  ```

  One file per change, so open pull requests never conflict over the changelog. A change that ships
  nothing a user sees still says so, in a fragment. `.changes/README.md` has the details.

- **Do not touch `package.json`'s version, and do not touch `CHANGELOG.md`.** Both are **outputs of a
  release**, not inputs to a pull request. CI rejects a pull request that edits either. The release
  step consumes the accumulated fragments, computes the version from the highest `bump:` among them,
  and writes the changelog.

  Choose the bump from **what a consumer experiences**, never from how much work it was. A fix is a
  `patch`. A backwards-compatible addition is a `minor`. A breaking change is a `major`, and below 1.0
  a `major` raises the minor number, which is how `0.x` says "this breaks you".

## Style

- Prettier and ESLint decide formatting; do not argue with them.
- Comments state what a function does and why it exists. No changelog-style comments ("previously
  this did X"), no exposition. Git history is the record of how code evolved.
- In documentation: no em dashes, no arrow characters, no horizontal rules, and do not number section
  headings (it breaks links when the order changes).

### Commit messages, pull requests, and changelog entries

These are a permanent public record of this repository. They say **what changed here and why**, in
plain businesslike prose, and nothing else.

- Do not reply to, argue with, or comment on other repositories. Mention another package only when it
  is part of the change itself, factually and briefly: "bring our dependencies into alignment with
  core" is fine, a critique of core's reasoning is not.
- Do not cite internal working documents. A reader of the repository cannot see them.
- Do not narrate how the work was produced. Say what it is and what you verified.

Verification results belong in the text, because they are the part a reviewer cannot reconstruct.
Editorial and process do not.

## Branches and pull requests

`main` is what has been released. Nothing lands on it except a release.

Work accumulates on `development`. Branch off it, open your pull request against it, and it merges
once CI is green. That is the whole of what a contributor does.

Releases are automatic and nobody runs them by hand. When CI goes green on `development`, the Mercury
Release Bot opens a **Release vX.Y.Z** pull request against `main`, computing the version from the
`bump:` fields of the accumulated fragments and assembling the changelog. It is an ordinary pull
request running the same CI as any other, so **no bot ever needs permission to bypass the gate**.
Merging it publishes: the images go to GHCR, the tag is cut, and the GitHub release is written. A
**Sync development** pull request then appears, bringing the release back to `development`, and it
needs merging too.

Both branches are protected: no direct pushes, no force pushes, and the checks must pass. That applies
to administrators too, and it is verified by attempting a push and being refused, not by reading the
settings back. If an administrator can push past CI, CI is a suggestion.

Merges are **merge commits**; squash and rebase are disabled on the repository. A squashed release
would give `main` a commit sharing no ancestor with `development`, and every later release would diff
against the beginning of the repository.

Keep a pull request to one coherent change. If you are fixing a bug and tidying the surrounding code,
those are two pull requests, or at least two commits with honest messages. A pull request that also
happens to reformat forty files cannot be reviewed.

Say in the pull request **what you exercised and what it showed**. If you drove the flow, say so. If
you only ran the tests, say that instead. That is the part a reviewer cannot reconstruct.

## Reporting things

- **A security problem:** do not open an issue. Follow `SECURITY.md`.
- **A bug or a feature idea:** open an issue. There are templates.

## License

By contributing you agree that your contribution is licensed under the Apache License 2.0, the same
as the rest of the project. See `LICENSE`.
