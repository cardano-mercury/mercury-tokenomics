## What this changes

<!-- What does it do, and why. Link the issue if there is one. -->

## How it was verified

<!-- What you actually ran or exercised, not just "tests pass". If you changed a flow, say what you
     drove through it. -->

## Checklist

- [ ] Tests cover the happy path, the unhappy paths, and any bug being fixed
- [ ] Documentation updated (`docs/usage.md`, `docs/design.md`, or `README.md`) if a user-facing or
      developer-facing surface changed
- [ ] `version` in `package.json` bumped (minor for a feature, patch for a fix, while below 1.0)
- [ ] A change fragment added under `.changes/unreleased/` (not an edit to `CHANGELOG.md`)
- [ ] `npm run lint`, `npm run check`, `npm test` and `npm run build` all pass locally
