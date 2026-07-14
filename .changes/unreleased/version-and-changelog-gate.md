---
type: Added
---

CI now enforces the versioning convention rather than trusting it. A pull request to `main` must
raise the version in `package.json` above the base branch's, and must describe the change. Changes
are described as one file per change under `.changes/unreleased/`, not by editing `CHANGELOG.md`
directly, so concurrent pull requests cannot conflict over the changelog. `npm run changelog` folds
the accumulated fragments into `CHANGELOG.md` at release time.
