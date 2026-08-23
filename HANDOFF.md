# HANDOFF — Harness robustness pass + Dependabot backlog triage

Branch: `master`. Nothing pending — every PR from this pass is merged or closed; the working tree
has no uncommitted changes.

## Why

Continuation of a multi-session harness-robustness pass that started from the user asking "how can
we make it more robust and better at making apps." Nine PRs shipped (#277–#285); this session also
fully triaged the 30+ open Dependabot PR backlog that had accumulated untouched.

## What changed — nine merged PRs, in landing order

1. **#277** — Fixed `allRuleMeta()` hardcoding every guardrail as blocking, which made
   `harness-history.mjs` cry wolf on `unpinned-deps` (then still non-blocking) every run.
2. **#278** — Patched 11 `npm audit` vulnerabilities (all transitive devDependencies); added
   `scripts/check-dependency-audit.mjs` (non-blocking sensor) so this can't recur silently.
3. **#279** — Slimmed `.agents/AGENTS.md` 1,305 → 641 lines (51%) by moving §6's 57 lesson
   bodies to `.agents/lessons/<slug>.md`, leaving a one-line index. Content fidelity verified
   byte-for-byte by script.
4. **#280** — Refreshed `HANDOFF.md` (was stale) and `IDENTITY.md`'s folder map.
5. **#281** — Added `.agents/skills/spec-review/SKILL.md` (WI-2 from
   `docs/EXTERNAL_REPO_ADOPTION_PLAN.md`) — the Spec axis nothing else in the harness covers.
   Dry-run verified against a real historical divergence. Also corrected the adoption plan's
   status header, which wrongly still called WI-6 proposal-only (it shipped in #273).
6. **#282** — Fixed `check-containment.mjs`'s `isContainmentAcknowledged()`: a root-level
   single-segment path (`CLAUDE.md`, `AGENTS.md`) could never be acknowledged by naming it in a
   PR body, only via `[containment-override: ...]`. Hit three times before the fix (once
   pre-dating this pass, twice during it).
7. **#283** — Pinned all 149 unpinned dependency entries across all six apps to their
   currently-resolved installed version (zero behavior change — verified via a lockfile diff with
   no `resolved`/`integrity` line changes). Promoted `unpinned-deps` from `manual-review` to a
   blocking guardrail — same arc `unit-test-coverage` went through.
8. **#284** — Recorded a fresh `harness-history.json` snapshot to clear the stale "chronically
   firing" signal the #283 promotion left against a pre-promotion baseline.
9. **#285** — Removed `dependabot.yml`'s root `directory: "/"` npm entry. For an npm workspace,
   Dependabot's root directive auto-expands to every workspace member, so it was duplicating the
   six per-app entries — found while triaging the backlog below (see next section).

## Dependabot backlog triage (this session, no code PR — direct PR management)

Started at 30 open PRs; a default-limit `gh pr list` call hid 3 more (33 real). Ended at **8 open,
all individually verified safe**, everything else closed with a reason on each:

- **11 duplicates** closed — the root-entry duplication #285 fixes. Each close comment points to
  the PR that already covers the same change.
- **3 confirmed broken**, need real feature work, not a bump — closed with reasoning:
  - `eslint-plugin-react-refresh` 0.5.x dropped CommonJS entirely; legal-financial-rag/mood-diner/
    portfolio-hub's legacy `.eslintrc.cjs` (ESLint 8) can't resolve the plugin's rules at all
    anymore. Needs an ESLint 9 flat-config migration first.
  - `lucide-react` 1.x removed the `Github`/`Linkedin` icons portfolio-hub's `src/App.tsx` imports
    — the exact incident `.agents/AGENTS.md` §6 already documents from a prior bump. Re-created
    once by Dependabot's normal cycle (as #286) before #285 merged; closed again, same reason.
  - The "react group" bump silently jumps **mood-diner from React 18.3.1 to 19.2.8** (a full
    major bundled into a routine grouped update) without its `@testing-library/react` peer,
    breaking `ErrorBoundary.test.tsx`. The other 5 apps in the group are already on React 19 and
    unaffected.
- **10 stryker-mutator PRs** (5 `core` + 5 `vitest-runner`, all 9.6.1→10.0.0) closed — tested
  locally in a scratch git worktree (`git worktree add`, `npm install`, `node
  scripts/run-mutation.mjs <app>`): `@stryker-mutator/core` 10.0.0 crashes outright (`TypeError:
  ts.parseConfigFileTextToJson is not a function`), a genuine upstream regression unrelated to
  this repo's own version choices. Mutation testing is informational-only, so nothing required
  was ever at risk.
- **8 verified safe, left open for the user to merge**: `next` 16.3.1 (#268) + its
  `eslint-config-next` peer per app (#240/#248/#263); typescript-eslint group (#247);
  `actions/cache` v4→v6 (#237, needed a containment-acknowledgment edit to its PR body first);
  `eslint-plugin-security` 4.0.1 (#258), `@testing-library/dom` 10.4.1 (#251), and `@types/node`
  26.2.0 (#264) — the last three tested locally via the same worktree technique, all fully clean.

**No PR was merged by this session** — per `.agents/AGENTS.md` §5/§8, agents never self-merge. All
verification (local worktree testing, CI log reading) was done to inform the human's merge
decision, not to substitute for it.

## Verified (representative commands actually run this session)

```
node scripts/harness-status.mjs --strict              -> 0 findings (was 6 medium before #283)
git worktree add <scratch> <dependabot-branch> && npm install && node scripts/run-mutation.mjs <app>
  -> reproduced the stryker-mutator/core 10.0.0 crash directly
node scripts/test-app.mjs <app> --skip-e2e             -> used to verify eslint-plugin-security,
  testing-library/dom bumps locally before recommending merge
```

## Repo hygiene

All stale Dependabot branches for closed PRs were auto-deleted by GitHub on close. No manual
branch cleanup needed this time (unlike earlier sessions' stale `claude/*` branches).

## Open / next steps

- **Merge the 8 verified-safe PRs** (#237, #240, #247, #248, #251, #258, #263, #264, #268) —
  ready whenever.
- **Three closed PRs represent real, deliberate future work**, not backlog to re-open casually:
  an ESLint 9 migration (3 apps), a lucide-react icon-source swap (portfolio-hub), and a
  coordinated React 19 migration for mood-diner (with its testing-library peer). Each needs its
  own scoped session, not a routine dependency bump.
- **Stryker 10.0.0 is upstream-broken** against this repo's TypeScript setup — worth checking back
  periodically (`npm view @stryker-mutator/core versions`) rather than re-attempting the same bump.
- `docs/SLIM_RULEBOOK_PROPOSAL.md`'s remaining phase (§5/§8 detail-splitting) is still an
  explicitly separate, later decision per that doc's own sequencing — not started.
