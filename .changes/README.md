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

```sh
npm run release          # compute the version, write the changelog, delete the fragments
npm run release -- --dry # show what it would do, touch nothing
```

The version is the highest `bump` among the fragments being consumed. Commit the result and open it as
an ordinary pull request: it runs the same CI as anything else, and the gate recognises a release and
checks the opposite rules (the version must be exactly what the fragments imply, and the changelog
must carry its section).

Once it is merged, tag the merge commit `v<version>`. The tag is what publishes the images, and the
release workflow refuses to publish if the tag and `package.json` disagree.
