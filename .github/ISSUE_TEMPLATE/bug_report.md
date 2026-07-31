---
name: Bug Report
about: Report an issue or test failure within a monorepo application
title: '[BUG]: '
labels: 'bug'
assignees: ''
---

## 🐛 Bug Description
A clear and concise description of what the bug is.

## 📍 Affected Application
- **Project Path**: `projects/<app-name>`
- **Test Suite**: Vitest Unit / Playwright E2E / Accessibility / Build Cleanup

## 🔄 Reproduction Steps
1. Run command `...`
2. Perform action `...`
3. Observe error `...`

## 📊 Expected vs. Actual Behavior
- **Expected Behavior**:
- **Actual Behavior**:

## 🔍 Error Traceback & Logs
```
Paste un-truncated terminal error logs here
```

## ⚠️ Is the failure what it looks like?

Several failures in this repo have a misleading surface. Before filing, rule out the ones already
documented in [`.agents/AGENTS.md`](../../.agents/AGENTS.md) §6:

- [ ] **Every spec failed in milliseconds** — that is usually the browser or the dev server never
  starting, not a real assertion. `npx playwright test` needs `HARNESS_CHROMIUM_PATH`, which
  `node scripts/test-app.mjs` normally supplies; run the harness script instead.
- [ ] **`toBeVisible()` failed on an SVG line** — a legitimately flat series has zero height and no
  bounding box. Assert `toHaveCount(1)` plus attributes instead.
- [ ] **A strict-mode violation reading like a duplicated element** — `getByLabel` matches a
  *substring* of the accessible name, so one label can resolve to several controls. Locate by role
  plus name.
- [ ] **A control looks broken but only the first field after `goto` is affected** — a `fill()`
  before hydration is silently reverted. Wait for the app's post-hydration marker.
- [ ] **A network-dependent E2E failed** — check whether the host is reachable at all before
  assuming the feature broke.

If it is none of these, say what you ruled out — it saves the next person the same search.
