# HANDOFF — Harness robustness pass, continued (dependency backlog cleared)

Branch: `master` (this item's own branch not yet created/pushed — see below; everything prior is
already merged, no other branch has pending work).

## Why

Continuation of the harness-robustness pass from the user's "how can we make it more robust"
question. Six PRs already shipped (#277–#282, all merged); this session clears the last
mechanical item from that original list: the `unpinned-deps` backlog.

## What changed (prior session, all merged)

1. **#277** — Fixed `allRuleMeta()` hardcoding every guardrail as blocking, which made
   `harness-history.mjs` cry wolf on `unpinned-deps` (then still non-blocking) every run.
2. **#278** — Patched 11 `npm audit` vulnerabilities (all transitive devDependencies); added
   `scripts/check-dependency-audit.mjs` (non-blocking sensor) so this can't recur silently.
3. **#279** — Slimmed `.agents/AGENTS.md` 1,305 → 641 lines (51%) by moving §6's 57 lesson
   bodies to `.agents/lessons/<slug>.md`, leaving a one-line index. Content fidelity verified
   byte-for-byte by script.
4. **#280** — Refreshed `HANDOFF.md` (was stale, pinned to a branch 8+ merges old) and
   `IDENTITY.md`'s folder map.
5. **#281** — Added `.agents/skills/spec-review/SKILL.md` (WI-2 from
   `docs/EXTERNAL_REPO_ADOPTION_PLAN.md`) — the Spec axis nothing else in the harness covers.
   Dry-run verified against a real historical divergence (`368dcf5`/PR #47 vs. its fix
   `33468cb`/PR #67). Also discovered and corrected: the adoption plan's status header wrongly
   still called WI-6 proposal-only — it shipped in PR #273, before this whole pass started.
6. **#282** — Fixed `check-containment.mjs`'s `isContainmentAcknowledged()`: a root-level
   single-segment path (`CLAUDE.md`, `AGENTS.md`) could never be acknowledged by naming it in a
   PR body — only `[containment-override: ...]` worked, `segments.length - 2` going negative for
   a one-segment path. Hit on #278 and #279 both, plus once before this pass (see the previous
   HANDOFF.md's own note, now resolved). `Math.max(0, segments.length - 2)` fixes it without
   touching the analogous (and *correctly* two-segment-only) function in
   `check-enum-blast-radius.mjs`.

## What changed (this session — not yet committed/pushed)

**Cleared the `unpinned-deps` backlog and promoted the guardrail to blocking.**

- Pinned all 149 unpinned dependency entries across all six apps to their currently-resolved
  installed version (`createRequire(...).resolve()`, with a directory-walk fallback for the 19
  packages whose own `exports` map blocks a `./package.json` subpath resolve). Text-level line
  replacement only — no `JSON.stringify` reformatting.
- Verified **zero behavior change**: regenerated `package-lock.json` and confirmed the diff
  contains no `resolved`/`integrity` line changes anywhere — every changed line is a declared
  range tightening to match what was already installed, no package's actual resolved version
  moved.
- Verified with a full `npm run lint` pass across all six apps, `check-peer-consistency.mjs`, and
  two complete `test-app.mjs` runs (`legal-financial-rag` clean; `travel-packing-app` had one
  flaky E2E test that passed cleanly on an isolated re-run — pre-existing worker-contention
  flakiness, unrelated to the pinning).
- Promoted `unpinned-deps` out of `GUARDRAIL_NON_BLOCKING_IDS` in `scripts/harness-status.mjs` —
  same arc `unit-test-coverage` went through (non-blocking while it described a backlog, blocking
  once it didn't). Updated the self-test in `harness-status.test.mjs` that specifically asserted
  `unpinned-deps` was non-blocking (written in #277) to assert the opposite — a regression test
  against `GUARDRAIL_NON_BLOCKING_IDS` quietly growing it back.
- Appended a "Promoted to blocking" note to `.agents/lessons/unpinned-deps.md` documenting the
  above, matching how other lessons narrate their own later resolution inline.

**Not yet done as of this handoff**: committing, opening the PR, and watching CI. Next agent (or
this session, resumed) should do that next — the working tree already has the fix; nothing here
is speculative or unverified.

## Verified (commands actually run this session)

```
node scripts/harness-status.mjs --strict     -> 0 findings (was 6 medium, 149 total hits)
npm run lint                                  (all 6 apps)  -> clean
node scripts/check-peer-consistency.mjs       -> PASSED
node scripts/test-app.mjs legal-financial-rag -> ALL HARNESS CHECKS PASSED
node scripts/test-app.mjs travel-packing-app  -> 1 flaky E2E, confirmed passing in isolation
git diff package-lock.json | grep resolved/integrity -> 0 matches
```

## Repo hygiene

Left the **24 open Dependabot PRs** deliberately untouched (same reasoning as the prior session):
`.agents/AGENTS.md` §6 documents a real incident from batch-merging 11 of these in one day.
Triaging them wants a one-at-a-time pass, not bulk action — still the one open item from the
original list nobody has picked up yet.

## Open / next steps

- Commit + PR the unpinned-deps work above, watch CI, merge.
- Triage the 24 open Dependabot PRs, one at a time.
- `docs/SLIM_RULEBOOK_PROPOSAL.md`'s remaining phase (§5/§8 detail-splitting, to hit the
  whole-file `<250 lines` target) is still an explicitly separate, later decision per that doc's
  own sequencing.
