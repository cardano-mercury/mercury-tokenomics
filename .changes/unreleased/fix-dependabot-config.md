---
type: Fixed
bump: patch
---

The Dependabot config was invalid and therefore doing nothing. `semver-major-days` and
`semver-minor-days` are not supported for the `github-actions` and `docker` ecosystems, and Dependabot
rejects a bad config **whole**, so the npm cooldowns were silently inactive too. Those ecosystems now
carry only `default-days`, which is all they support.
