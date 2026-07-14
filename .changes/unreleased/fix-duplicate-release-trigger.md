---
type: Fixed
bump: patch
---

Merging a release no longer fires the publish workflow twice. `workflow_run`'s `branches:` filter
matches the CI run's **head** branch, not its base, so the CI run for the Sync development pull request
(whose head is `main`) matched as well as the push to `main` itself. Two publish runs raced for the
same version and one failed on the tag. Both release workflows now require the triggering CI run to
have come from a `push`, and the publish workflow takes a concurrency lock.
