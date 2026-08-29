# HANDOFF — Job-search framing pass: README pitch + portfolio-hub recruiter-scan redesign

Branch: `portfolio-recruiter-redesign`, PR [#319](https://github.com/jf1shh/agentic-app-harness/pull/319),
squash auto-merge armed. Not yet merged as of this writing — one CI job (`SDD Spec & Quality Sentinel
Audit`) failed on a transient `ETIMEDOUT` downloading `onnxruntime-node`'s native binary during
`legal-financial-rag`'s RAG-eval dependency install, unrelated to this diff; a rerun was triggered.

## Why

Continuation of the author's job-search work (targeting AI Product Manager / Technical PM roles, not
software engineering roles — see the career-transition context in the author's own memory, not
repeated here). Two asks in this session: (1) fix the README's top-level pitch so a hiring manager
skimming it doesn't have to read the full governance rulebook to get the point, and (2) reposition
and redesign `portfolio-hub` so a recruiter's ~7–20 second first pass lands on name → title → proof →
contact, per current portfolio-design best practice, instead of scrolling through three stacked
panels of overlapping identity copy before reaching the first project.

## What changed (all on `portfolio-recruiter-redesign`, not yet in `master`)

1. **`README.md`** — added an author byline under the banner and tightened "Why this exists" to lead
   with a bolded one-sentence hook, cut sensor/guardrail jargon, and route the reader (skimmers to
   Live Showcase, engineers to `.agents/AGENTS.md` §8–9) instead of funneling everyone into the deep
   rulebook.
2. **`projects/portfolio-hub/src/App.tsx`** — repositioned the author from "AI/Full-Stack Engineer"
   to "AI Product Manager" (About panel + footer) to match the actual role target. Merged the header's
   About panel and the separate Hero Banner/Metrics panel into one hero: name, role badge, one-line
   pitch, LinkedIn/email CTAs, and five headline proof stats (apps, tests, WCAG AA, guardrails,
   lessons) — all above the project grid, no scroll needed to reach a CTA. `AnimatedStat` gained a
   `compact` prop for the tighter hero chips; the Loop Dashboard section further down still exists
   and deliberately still repeats guardrail/lesson/app counts (for a reader who scrolled that far
   wanting the mechanism, not just the number) with a one-line intro instead of a paragraph.
3. **`projects/portfolio-hub/src/data/projectsData.ts`** — all five `description` fields rewritten
   from 2–3 sentence feature dumps to one punchy clause; `tagline` (already the skimmable headline)
   untouched.
4. **`specs/portfolio-hub-spec.md`** §4.6 (new) — documents the hero consolidation and why the Loop
   Dashboard's repeated numbers are deliberate, per this repo's own spec-before-code rule.
5. **`projects/portfolio-hub/e2e/portfolio-hub.spec.ts`** — the Loop Dashboard test now scopes its
   locator to a new `#loop-dashboard-section` id, since the hero strip's intentional duplication of
   guardrail/lesson/app-count text broke the old unscoped `page.getByText(...)` strict-mode match.
   This is a legitimate scope-narrowing to match new, spec-documented behavior, not a weakened
   assertion — see `.agents/AGENTS.md` §9.4 if this needs re-justifying later.
6. **`.github/screenshots/portfolio-hub.png`** — recaptured at the same 1400×1000 against the
   rebuilt hero (the committed one still showed the old three-panel layout with the retired
   "SDD Verified" badge). This is the same PNG both this README and `jf1shh/jf1shh`'s profile
   README embed via a `raw.githubusercontent.com/.../master/...` URL, so once this PR merges to
   `master` both READMEs pick it up automatically — no separate edit needed in `jf1shh/jf1shh`.
7. **`jf1shh/jf1shh`** (separate repo, `~/Projects/jf1shh`) — reviewed for staleness per the same
   "docs fully up to date" ask. No edit needed: its README's positioning ("AI Product / AI Solutions
   roles in regulated, operational domains") already matches, and its stat badges (10 guardrails, 58
   lessons, 6 live apps) already match current `agentic-app-harness` values. Its embedded screenshot
   auto-updates per point 6 above once #319 merges.

## Verified (representative commands actually run this session)

```
node scripts/test-app.mjs portfolio-hub
  -> security audit, lint, type-check, 65 unit tests, 13 Playwright/axe e2e tests all PASS,
     including two zero-violation WCAG 2.0 AA sweeps (collapsed and with 4 disclosures expanded)
node scripts/harness-status.mjs --gate / harness-learn.mjs / check-loop-stats.mjs /
  check-peer-consistency.mjs / check-doc-claims.mjs --gate
  -> all PASS (also re-run automatically by the pre-push hook on both pushes this session)
Playwright screenshots at 1280px, 390px (mobile), and the README's 1400x1000 -> visually verified
  the hero renders correctly, wraps correctly on mobile, and matches the regenerated screenshot
```

## Repo hygiene / open items

- **PR #319 needs the rerun's outcome checked** (see top of this file) — if the sentinel job goes
  green, squash auto-merge will complete on its own; if it fails again for a real reason (not the
  network flake), it needs a look before merging.
- **A fresh Dependabot backlog has accumulated**: ~29 open PRs as of this session (#258–#313,
  numbering picks up past where the prior HANDOFF's triage left off). Out of scope for this session
  — not touched, not triaged. Whoever picks this up next should re-run the same worktree-verification
  technique the prior triage pass used (`git worktree add`, `npm install`,
  `node scripts/run-mutation.mjs <app>` / `node scripts/test-app.mjs <app> --skip-e2e`) rather than
  trusting Dependabot's own "safe to merge" heuristics.
- `docs/SLIM_RULEBOOK_PROPOSAL.md`'s remaining phase (§5/§8 detail-splitting) is still separate,
  later, explicitly-sequenced work — still not started, unrelated to this session.
