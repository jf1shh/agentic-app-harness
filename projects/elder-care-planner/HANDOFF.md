# Agent Handoff — Elder Care Cost Planner

**State:** V1 complete and green. `node scripts/test-app.mjs elder-care-planner` passes all checks
(security advisory-only, lint, type-check, 112 Vitest, 29 Playwright + axe).

**Spec:** [`specs/elder-care-planner-spec.md`](../../specs/elder-care-planner-spec.md) — revision 4,
marked V1 IMPLEMENTED. Read §2 (research) before changing scope; the feature set is derived from it,
not from intuition.

---

## What was built

Triage-first single-page planner. Five fields produce an all-in cost, a funding runway, a sensitivity
ranking and a per-sibling share; everything else is optional refinement. Eight pure engines under
`src/lib/engine/`, a Zod contract in `src/lib/schemas.ts`, and cited datasets under `src/lib/data/`.

Registered in the CI matrix (`.github/workflows/ci.yml`), the Pages deploy
(`.github/workflows/deploy-pages.yml`, step 6), and the portfolio hub
(`projects/portfolio-hub/src/data/projectsData.ts` — this required extending the category enum in
`projects/portfolio-hub/src/schemas.ts` with `'Family Finance'`).

Ports: dev `3011`, production bundle `5189` root / `5190` under the Pages subpath.

## Open items, in priority order

1. **Cost dataset licensing (blocks a public launch, not the build).** `COST_DATA_SOURCE.licensingConfirmed`
   in `src/lib/data/costOfCare.ts` is `false`. The CareScout/Genworth figures are publicly reported,
   but redistribution terms have not been confirmed. If attribution proves insufficient, fall back to
   public government sources (state ombudsman rate reports, CMS) plus the user-quote path, and update
   the provenance block. Spec §10.1.

2. **Two figures need primary-source verification.** Both are flagged in the data and surfaced in the
   UI, so they are honest — but they should be replaced:
   - `adult_day_care` monthly (`confidence: 'needs_verification'`) came from a secondary summary. The
     primary sources 403'd on fetch during the build session; retrieve the published survey PDF.
   - `memory_care` (`confidence: 'derived'`) is assisted living + 25%, because memory care is not a
     surveyed category. Replace with a real figure or keep it explicitly derived.

3. **State-level cost figures are deliberately absent.** `STATE_MEDIANS` is an empty array and every
   state resolves to the national median with a labelled fallback. This is intentional — the spec
   forbids interpolating figures. Transcribing and verifying real state data is the single highest-value
   improvement available, and `resolveCost()` already supports it with no other code changes.

4. **Ledger and caregiver opportunity cost are engine-only.** `engine/ledger.ts`, `engine/opportunity.ts`
   and `engine/tax.ts` are fully implemented and unit-tested but have no UI yet. `PlanSchema` already
   carries `ledger` and `caregiverImpacts`. Wiring them up is additive.

5. **V2, explicitly deferred in the spec** (these are the 5 unchecked spec items the harness reports as
   drift — that finding is expected, not a defect): Medicaid eligibility modelling, encrypted shared
   family link, care-hours scheduler, reverse-mortgage modelling, receipt capture.

## Things to not undo

- **The non-goals in spec §1.1 are binding**, not preferences. No facility directory, no lead capture,
  no referral revenue, no accounts, no analytics. `e2e/privacy.spec.ts` enforces the network and
  form-field parts mechanically; the referral ban is a human commitment. A tool with a financial
  interest in which option a family picks cannot make believable cost comparisons — that is the whole
  wedge against the incumbents.

- **Golden fixtures are hand-computed, with the arithmetic in the comments.** Do not regenerate them
  from the implementation. A fixture captured from the code under test proves only self-consistency,
  which is precisely how a financial planner quietly harms someone. Mutation-verified: shifting the
  depletion month by one fails six tests.

- **The neutral-voice rule in `recommendation.ts`** is enforced by a unit test (`/\byou(r|rs)?\b/i`
  must not match) and an E2E test on the summary. When the app states the split, it is not the sister
  stating it — that reframing is doing real work at a family meeting.

- **`formatCentsPrecise` in the split tables.** Whole-dollar rounding made the displayed shares fail to
  sum to the displayed total. See the lesson added to `.agents/AGENTS.md` §6.

- **Medicare copy stays on the results page**, not behind a disclosure. Assuming Medicare covers
  long-term custodial care is the most expensive misconception in this domain.

## Verify before pushing

```bash
node scripts/test-app.mjs elder-care-planner
node scripts/harness-status.mjs --gate
node scripts/harness-learn.mjs
```
