# Elder Care Cost Planner

> Spec: [`specs/elder-care-planner-spec.md`](../../specs/elder-care-planner-spec.md) — the single
> source of truth. Read it before changing anything here.

What care really costs, how long the money lasts, and how a family can share it.

A private, offline-first planner for the situation most families meet without warning: a parent
needs care, nobody knows what it costs, and the decision has to be made in weeks. Everything is
computed in the browser. There is no account, no email field, and no network request carrying any
of the figures entered.

**Live:** https://jf1shh.github.io/agentic-app-harness/elder-care-planner/

---

## Why this exists

The scope was set by research into caregiver forums and industry survey data rather than by
intuition. Six findings drove the feature set — the full write-up is §2 of the spec.

| Finding | What it produced |
|---|---|
| Only ~18% of families feel they understand senior living costs, and nearly a third pay more than expected after moving in. Tiers, community fees and 3–5% escalators are absent from the brochure. | **All-in cost engine** — shows advertised vs. realistic side by side with the gap named |
| 69% secure care within 60 days, while 77% expected far longer. People arrive in crisis. | **Triage-first** — five fields, an answer in under a minute, refinement optional |
| Home vs. facility is the dominant decision, and it has a computable crossover near 40 hrs/week. Most comparisons omit the cost of staying home. | **Break-even analyzer** with both sides fully loaded |
| Money is the leading source of sibling conflict; 78% report out-of-pocket costs. | **Split calculator** plus a pledged-vs-paid ledger, with time and tasks as first-class contributions |
| ~40% of caregivers cut back work; 60% of supporting children take on debt. | **Caregiver opportunity cost** and a borrowing-starts-at-month-N flag |
| Benefits are lost to timing, not ineligibility. | **Benefit cards led by their timing traps** — Medicaid's five-year lookback, LTC elimination periods |

Two features exist purely to make the output useful rather than merely correct:

- **"Questions to ask before you sign"** — the checklist that forces hidden fees into the open at
  the moment of negotiation. Cheapest genuinely useful screen in the app.
- **"What would change this answer"** — sensitivity ranking, so every recommendation names its top
  driver instead of pretending to certainty.
- **A contribution ledger** — who actually paid what, when, and for what, reconciled against the
  agreed share. Money is the leading source of sibling conflict, and a split settles that only in
  theory; a written record settles it in practice, kept by the plan rather than by whichever
  family member has been keeping score. Unpaid care hours are shown beside the cash rather than
  netted off it — weighing someone's time against someone else's money is a family decision.
- **"Show the working"** — a question mark beside every headline figure opens its derivation: the
  formula, each input with its source, the arithmetic line by line, the assumptions applied, and
  what the figure cannot account for. A family is being asked to make an irreversible financial
  decision on the strength of these numbers, and an unexplained projection is indistinguishable
  from a guess with a nice font. The same derivations are laid out in full in a permanent
  "How every number is worked out" section, because a control that has to be discovered is not
  transparency.

## Non-goals (binding — see spec §1.1)

- **No referral revenue, ever.** No facility directory, no lead capture, no affiliate fees. Almost
  every senior-care calculator on the web is lead generation, and families know it. A tool with a
  financial interest in which option a family picks cannot make believable cost comparisons.
- **No account, no email field, no analytics, no user data over the network.**
- **No point estimates where a range is the honest answer.**
- **No eligibility determinations** for Medicaid, VA or tax positions. The app informs and refers out.

## Architecture

Next.js App Router, static export, vanilla CSS, Zod contracts. No charting library — the runway
chart is inline SVG paired with an equivalent data table.

```
src/lib/
  schemas.ts              contract-first Zod models; types inferred via z.infer
  data/costOfCare.ts      cited cost figures, each carrying its confidence level
  data/feeStructures.ts   typical fee ranges for checking a contract against
  data/benefits.ts        benefit cards, each led by its timing trap
  data/questionsToAsk.ts  scenario-keyed negotiation + attorney checklists
  engine/                 pure functions — no React, no storage, no ambient clock
    cost.ts        all-in monthly cost, advertised vs. real
    breakeven.ts   home-vs-facility crossover, both sides loaded
    runway.ts      month-by-month depletion simulation
    sensitivity.ts which assumption moves the runway most
    split.ts       largest-remainder split that always sums exactly
    ledger.ts      pledged vs. actually paid, and per-category totals
    opportunity.ts caregiver lost wages and employer match
    tax.ts         medical expense deduction estimate
    plan.ts        orchestration
  data/expenseCategories.ts  plain-language names for the ledger's categories
  explain/                engine output -> derivations a reader can check by hand
    types.ts       the shape of a derivation, plus its balance invariant
    build.ts       one builder per headline figure
  recommendation.ts       decision copy, in an enforced neutral voice
  storage.ts              localStorage boundary, Zod-validated
```

Engines are pure so the arithmetic is fully testable and the UI cannot introduce arithmetic of its
own. `explain/` is bound by the same rule from the other side: it *restates* engine output and
never recomputes it. A parallel implementation of the same formula would drift from the engine
silently, and a confidently wrong derivation is worse than no derivation at all.

## Data provenance

Figures come from the CareScout (Genworth) Cost of Care Survey, 2025 (surveyed July–November 2025),
retrieved 2026-07-26. Every entry carries a confidence level and the UI surfaces it:

- `verified` — cross-checked against two independent reports of the primary survey
- `needs_verification` — from a single secondary summary; flagged in the UI
- `derived` — not a surveyed category (memory care), computed and flagged as a placeholder

**State-level figures are deliberately absent.** The survey publishes them, but they have not been
transcribed and verified, and the spec forbids interpolating them. Every state resolves to the
national median and the UI says so. A labelled fallback is honest; an invented state number is not.

Every scenario supports a real-quote override, which beats any median.

Dataset licensing is an open question (spec §10.1) — `COST_DATA_SOURCE.licensingConfirmed` is
`false` until attribution terms are confirmed.

## Testing

```bash
node scripts/test-app.mjs elder-care-planner   # from the repo root — the authoritative gate
npm test                                       # Vitest only
npx playwright test                            # E2E only
```

- **171 unit tests**, BDD-formatted, covering every engine, the schema boundary and every
  derivation.
- **Golden fixtures are hand-computed by a human**, with the arithmetic written out in the test
  comments. Values captured from the implementation would only prove the code agrees with itself —
  which is exactly how a tool like this would quietly harm someone. Verified by mutation: shifting
  the depletion month by one fails six tests.
- **Derivations are checked as rendered, not as computed.** The parts shown in an explanation must
  sum to the total shown, so the assertions parse the formatted strings — a figure can be right to
  the cent and still display a table that visibly does not add up, and that is the failure that
  costs a family's trust. Verified by mutation: dropping the add-on rows, or removing the explicit
  clamp step where income exceeds cost, each fails the suite.
- **45 E2E specs** including axe accessibility on the default view, the large-text view, with a
  derivation panel open and with the ledger in use; a 200% zoom overflow check; and a
  production-bundle smoke test that loads the built output at the real Pages subpath and fails on
  any response ≥ 400.
- **E2E specs wait for hydration before their first interaction.** A `fill()` that lands before
  React attaches its listeners is silently reverted, and the failure surfaces later as a submit
  button that never enables. See the lesson in `.agents/AGENTS.md` §6.
- **The privacy claim is proved, not asserted**: one spec blocks every outbound request and runs the
  full triage → refinement → split → summary flow to completion.

## Accessibility

WCAG 2.1 AA, zero axe violations. 17px base type with a larger-text toggle, because the users are
often older adults or their children reading a phone in a hospital corridor. All colour pairs
verified at 4.5:1 or better. No animation on results — this is a stressful context; numbers should
appear, not perform. The derivation panel is a proper dialog: `Escape` closes it, `Tab` stays
inside it, and focus returns to the question mark that opened it so a keyboard reader does not lose
their place on a long page.

## Status

V1 complete. The ledger is now on screen; the caregiver opportunity-cost and tax-estimate engines
are still engine-only, and each needs its own derivation when it gains a UI — an app where some
numbers can be checked and the ones beside them cannot is worse than one that never offered. Deferred to V2 and documented in the spec: Medicaid eligibility modelling (deliberate
— state-specific rules that cause real harm when subtly wrong), a shared encrypted family link, a
care-hours scheduler, and reverse-mortgage modelling.
