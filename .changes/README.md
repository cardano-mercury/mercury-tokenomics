# Change fragments

Every pull request describes itself with **one new file** in `unreleased/`. It does not edit
`CHANGELOG.md`, and it does not touch the version in `package.json`.

Both of those are **outputs of a release, not inputs to a pull request**. If a pull request edits the
changelog, then every open pull request touches the same few lines of the same file and they all
conflict with each other, and the conflicts get resolved by hand at the exact moment nobody is paying
attention to them. If a pull request picks its own version, then two of them pick the same one. A new
file per change cannot conflict, and the release works out the version from what it finds.

## Adding one

Create `unreleased/<short-slug>.md`:

```markdown
---
type: Fixed
bump: patch
---

Vesting no longer rounds a bucket's final month down to zero.
```

`type` is one of Keep a Changelog's: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
`Security`.

`bump` is what this change does to the version, chosen from **what a consumer experiences**, not from
how much work it was:

| bump    | when                                           |
| ------- | ---------------------------------------------- |
| `patch` | a fix, or a change with no effect on behaviour |
| `minor` | a backwards-compatible addition to the surface |
| `major` | a breaking change to the surface               |

Below 1.0, a `major` raises the **minor** number (`0.16.0` to `0.17.0`). That is how `0.x` says "this
breaks you". Do not hide a break in a patch because the number looks less alarming.

The body is what a reader of the changelog needs: what changed and why it matters, not how it was
implemented. Several bullets are fine.

CI rejects a pull request with no fragment, with a malformed one, or one that edits the version or the
changelog.

## Releasing

**Nobody runs the release by hand.** When CI goes green on `development`, the Mercury Release Bot
opens (or updates) a **Release vX.Y.Z** pull request against `main`, carrying the version bump, the
assembled changelog, and the removal of the fragments it consumed. The version is the highest `bump`
among them.

It is an ordinary pull request and runs the same CI as anything else, so nothing bypasses the gate.
The gate recognises a release and checks the opposite rules: the version must be exactly what the
fragments imply, and the changelog must carry its section.

Merging it is the act that publishes. CI runs on `main`, then the release workflow pushes both images
to GHCR, tags `v<version>`, and cuts the GitHub release. No tag to remember, no manual publish.

The pull request must be merged with a **merge commit**. The repository allows no other kind, on
purpose: a squash would give `main` a commit sharing no ancestor with `development`, and every later
release would then diff against the beginning of the repository.

Afterwards the bot opens a **Sync development** pull request, bringing the release back to
`development`. **Merge it.** Until it lands, `development` still holds the fragments that release
already shipped, and the next release would assemble them a second time from a superseded
`package.json`.

To see what a release would contain before it is cut:

```sh
npm run release -- --dry   # print the version and the changelog section, touch nothing
```

`npm run release` without `--dry` is what the bot runs. There is no reason to run it yourself.
