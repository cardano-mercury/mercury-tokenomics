---
type: Changed
bump: patch
---

A pull request may now satisfy the change gate by revising a change fragment that has not been released
yet, not only by adding a new one. Correcting the wording or the bump of a pending entry is a
legitimate change, and previously the gate rejected a pull request that did only that.
