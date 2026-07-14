---
type: Added
---

Continuous integration, split from publishing. `ci.yml` is the quality gate: it runs on every pull
request and on pushes to `main`, checks lint, types, tests and a no-environment production build, and
builds both container images without pushing them, so a broken Dockerfile fails the pull request
rather than the release. `release.yml` runs only on a `v*` tag and publishes the images to GHCR; it
reuses the CI workflow as its first job, so a tag cannot ship an image that never passed the gate.
