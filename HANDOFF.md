# HANDOFF — Harness robustness pass (three fixes, no app changes)

Branch: `master` (each item below landed as its own PR, already merged; no branch is currently
checked out with pending work).

## Why

The user asked how to make the harness itself "more robust and better at making apps" after its
first GitHub star. This session found and fixed three real issues in the harness's own machinery
(not the six apps), in priority order the user picked interactively.

## What changed (three merged PRs, in landing order)

1. **PR #277 — `allRuleMeta()` blocking-registry bug.** `scripts/harness-status.mjs`'s rule
   registry hardcoded every guardrail's finding type as `'guardrail'` (blocking), but the
   `unpinned-deps` guardrail's real findings carry type `'manual-review'` (deliberately
   non-blocking). `harness-history.mjs` read the registry as saying "blocking" while the live gate
   said "not blocking" for the same rule, so its "chronically firing — check for a bypassed gate"
   signal was crying wolf on `unpinned-deps` every run — which risks masking a *real* bypassed gate
   reported alongside a known-false one. Fixed by extracting one shared `guardrailFindingType()`
   helper used by both `senseApp()` and `allRuleMeta()`. Added a self-test asserting the registry's
   `blocking` flag agrees with `isBlocking()` on the real finding, for every fixture case.

2. **PR #278 — 11 `npm audit` vulnerabilities + a new sensor so it can't recur silently.** Found
   while doing routine branch cleanup (a `git push` warning line nobody reads). All 11 were
   transitive devDependencies (`undici` via `promptfoo`'s eval tooling, `nanoid` via `postcss`,
   `uuid` via `@capacitor/cli`'s unused iOS tooling, `qs` via Stryker's `typed-rest-client`) — none
   shipped in a production bundle, but the fix was mostly free (`npm audit fix` cleared 7/11; the
   last 3 needed one scoped root `package.json` `overrides` entry). Added
   `scripts/check-dependency-audit.mjs` (+ self-test), wired non-blocking into `sdd-sentinel.yml`,
   so `npm audit --json` against the shared lockfile is a single visible CI log entry instead of six
   buried per-app runs nobody was reading.

3. **PR #279 — Slimmed `.agents/AGENTS.md` from 1,305 → 641 lines (51% smaller).** Executed
   `docs/SLIM_RULEBOOK_PROPOSAL.md` Step 1 (already-approved-by-user proposal, previously
   unimplemented): §6's 57 lesson bullets moved from inline prose to a one-line index, full text
   relocated verbatim to `.agents/lessons/<slug>.md` (one file per lesson). Content fidelity checked
   byte-for-byte by script (not by eye); all 10 guardrail-tagged lessons' titles cross-checked
   against `harness-status.mjs`'s `lesson:` fields so `harness-learn.mjs` needed no code change.

## Verified (commands actually run, not recalled — see each PR body for full output)

Every PR: `harness-status.mjs --gate`, `harness-status.test.mjs`, `harness-learn.mjs`,
`check-loop-stats.mjs`, `check-doc-claims.mjs --gate` — all green. #278 additionally: full
`test-app.mjs` on `legal-financial-rag` + `elder-care-planner`, `rag-eval-gate.mjs` (100%
precision@K, exercises the patched `undici` chain end-to-end), `npx cap --version` (confirms
`@capacitor/cli` untouched by the `xcode` override). #279 additionally: portfolio-hub's
`loopStats.generated.test.ts` (3/3), and a script-verified byte-diff proving no lesson prose was
altered during the move.

## Repo hygiene done alongside (not code, but real)

- Deleted 5 stale remote branches (2 merged, 2 abandoned/closed — `claude/travel-packing-travel-mode`
  and `claude/travel-packing-weather-extras` are the exact "promised follow-up" failure §6's own
  lesson warns about, never revisited).
- Left the **24 open Dependabot PRs** untouched deliberately — §6 documents a real incident
  (`A Green PR Check Is Not a Green Master`) from batch-merging 11 of these in one day; triaging
  them wants a one-at-a-time pass, not bulk action.

## Open / next steps

- **A recurring CI friction point, hit independently twice now** (once in the audit that produced
  the previous version of this file, again in PR #278 and #279): `check-containment.mjs`'s
  `isAcknowledged()` requires a *2-segment* path slice to appear in the PR body
  (`segments.length - 2` loop iterations), so a root-level single-segment filename — `CLAUDE.md` is
  the recurring offender — can **never** be acknowledged by naming it in prose, no matter how it's
  phrased. Only `[containment-override: CLAUDE.md]` satisfies it. Worth fixing the matcher itself
  (extend the loop to `segments.length - 1`, or treat a bare filename as its own 1-segment match) —
  noted twice now, still unbuilt.
- **Remaining items from the original prioritized list**, not yet picked:
  - Clear the **unpinned-deps backlog** (149 unpinned versions across 6 apps) so the existing
    non-blocking `unpinned-deps` guardrail can be promoted to blocking.
  - Build the **spec-review skill** (`docs/EXTERNAL_REPO_ADOPTION_PLAN.md` WI-2) — closes the gap
    where shipped code silently diverges from its spec; several §6 lessons trace to exactly this.
  - Triage the 24 open Dependabot PRs, one at a time, per app.
- **§5/§8 detail-splitting** (the rest of `SLIM_RULEBOOK_PROPOSAL.md`, to hit the whole-file
  `<250 lines` target) is explicitly a separate, later decision per that doc's own sequencing — not
  started, contingent on §6's split (done) measuring clean over time.
