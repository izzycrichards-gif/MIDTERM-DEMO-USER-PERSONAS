---
name: Vite runtime caches
description: Distinguishing installed runtime versions from stale optimized browser dependencies after upgrades.
---

Matching installed React and React DOM versions do not prove that Vite's optimized browser runtime is current.

**Why:** After a runtime upgrade, the preview served an old optimized React DOM alongside the new React package even though the package manager reported matching installed versions.

**How to apply:** When a runtime reports mixed versions after dependency changes, inspect the dependency optimizer cache as well as the installed packages. Re-optimize stale dependencies rather than repeatedly changing already-correct version pins.
