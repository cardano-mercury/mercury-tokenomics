---
type: Fixed
---

The version and changelog gate no longer skips its own change-fragment check when the base branch has
no `package.json` (a first release). It gated the diff on the file existing, so a first release saw no
changed files at all and could never find its own fragments.
