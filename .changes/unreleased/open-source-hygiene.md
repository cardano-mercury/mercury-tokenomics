---
type: Added
---

Community health files for public contribution: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor
Covenant 2.1), `SECURITY.md` with private vulnerability reporting and an explicit scope, `CODEOWNERS`,
issue and pull request templates, and a Dependabot configuration that deliberately excludes
`better-auth` and `@cardano-mercury/core`, which must be bumped in lockstep across the Mercury apps.

Dependabot runs weekly with a cooldown so a release must be 14 days old (major) or 7 days old (minor)
before it is proposed, a low cap on open pull requests, and groups by blast radius: security fixes
alone, majors alone, and routine minor and patch bumps batched per dependency type.
