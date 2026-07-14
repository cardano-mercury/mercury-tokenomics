# Change fragments

Every pull request that ships a feature or a fix describes it with **one new file** in
`unreleased/`, instead of editing `CHANGELOG.md`.

Editing `CHANGELOG.md` in a pull request means every open pull request touches the same few lines of
the same file, so they all conflict with each other, and the conflicts get resolved by hand at the
exact moment nobody is paying attention to them. A new file per change cannot conflict.

## Adding one

Create `unreleased/<short-slug>.md`:

```markdown
---
type: Fixed
---

Vesting no longer rounds a bucket's final month down to zero.
```

The type is one of Keep a Changelog's: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
`Security`. The body is what a reader of the changelog needs to know: what changed and why it
matters, not how it was implemented. Several bullets are fine.

CI rejects a pull request to `main` that has neither a new fragment nor a release section, and it
separately requires the version in `package.json` to be above `main`'s.

## Releasing

After the final version bump, fold the fragments into the changelog and delete them:

```sh
npm run changelog        # writes the section, removes the fragments
npm run changelog -- --dry   # preview without touching anything
```

Then commit, merge, and tag `v<version>`. The tag is what publishes the images.
