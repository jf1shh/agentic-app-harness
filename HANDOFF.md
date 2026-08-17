# HANDOFF — CI path-filtering & per-app releases (PR #236)

Branch: `claude/separate-app-repos-jphxhb` · PR: #236 (draft)

## Why
User considered splitting the six apps into separate repos (motivations: independent
deploys/releases, clone size / CI cost, "feels cleaner"). Splitting would break the harness's
whole value — the cross-app consistency gates, one rulebook, the shared lesson/history ledger —
so the monorepo was kept and the two real problems (independent release cadence, CI cost) were
solved in place.

## What changed
- **`.github/workflows/ci.yml`** — per-app test legs now diff against the PR base / previous push
  tip and skip their expensive suite when neither that app (`projects/<app>/**`,
  `specs/<app>-spec.md`) nor shared infra (root lockfile, `scripts/`, rulebook, `tsconfig*`,
  `ci.yml`) changed. All six `test (<app>)` legs still instantiate, so every required status check
  still reports — branch protection is untouched. A shared-infra change rebuilds all six.
- **`.github/workflows/deploy-pages.yml`** — Pages replaces the whole site with one artifact, so
  the full `portfolio-hub/dist` tree is still assembled every deploy. Path-filtering is a per-app
  **build cache** (`actions/cache`, key = `hashFiles(lockfile, projects/<app>/**)`): unchanged apps
  restore from cache, only changed apps rebuild. Portfolio-hub always builds first (its `clean`
  wipes `dist/`, so app caches must restore into `dist/<app>` after it).
- **`.github/workflows/release.yml`** (new) — push a `<app>-v<version>` tag (or `workflow_dispatch`)
  to build only that app, zip its output (`out/` for Next.js apps, `dist/` for Vite apps), and
  publish a GitHub Release via the pre-installed `gh` CLI. One file, app resolved from the tag.
- **`CLAUDE.md`** — CI section documents all three.

## Verification
Local gates green pre-push (harness-status `--gate`, learn, doc-claims, loop-stats,
peer-consistency, diff-size); `test-app.mjs` not run because no app code changed (workflow YAML
+ one doc paragraph only). Output pasted verbatim in the PR body.

## Open / next steps
- **A top-level contained file needs the `[containment-override: …]` marker — naming it in prose
  is not enough.** `check-containment.mjs`'s `isContainmentAcknowledged` accepts a path only via a
  two-segment-minimum substring; its loop is `for (i=0; i <= segments.length - 2; …)`, which never
  runs for a single-segment path like `CLAUDE.md` or `AGENTS.md`. So a multi-segment file
  (`.github/workflows/ci.yml`) is acknowledged by naming it, but a root file can only be
  acknowledged by `[containment-override: CLAUDE.md]`. This is what kept the Sentinel red from the
  first commit; the fix is the override marker in the PR body. Verify acknowledgment locally with
  `PR_BODY` set (`PR_BODY="…" node scripts/check-containment.mjs --base origin/master --head HEAD`)
  before pushing — a bare `check-containment.mjs` run with no `PR_BODY` reports every file as
  unacknowledged and hides which form the body actually needs.
- **Containment reads the body as of the triggering push.** Updating the PR body does not
  re-trigger the Sentinel (no `pull_request` synchronize event); only a new push does. So fix the
  body first, then push.
- The `deploy-pages` cache busts on any change under `projects/<app>/**` (test/README edits
  included) — deliberately conservative. Narrowing the hash to build-affecting paths is a possible
  follow-up.
- Per-app *deploys* (beyond GitHub Releases) on the tag trigger remain a future option.
- `deploy-pages.yml` still uploads one combined artifact by design; the cache is the cost lever.
