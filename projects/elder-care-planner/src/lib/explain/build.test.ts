import { describe, it, expect } from 'vitest';
import { buildExplanations, EXPLANATION_ORDER, type ExplanationInputs } from './build';
import {
  additiveTotalCents,
  hasArithmetic,
  isBalanced,
  resultStep,
  type Explanation,
  type ExplanationId,
} from './types';
import {
  INITIAL_STATE,
  buildPlan,
  breakEvenScenarios,
  makeContributors,
  type PlannerState,
} from '../plannerState';
import { computePlan, breakEvenBetween, aideHourlyRateCents } from '../engine/plan';
import { summariseLedger } from '../engine/ledger';
import type { LedgerEntry } from '../schemas';
import { formatCentsPrecise } from '../format';

/**
 * These tests exist to stop the explanations becoming a second, divergent
 * implementation of the engines. Two properties matter more than any individual
 * string of copy:
 *
 *   1. Every cents figure in a derivation equals the engine's figure.
 *   2. The parts shown add up to the total shown — which is the exact check a
 *      sceptical reader performs the moment the panel invites them to.
 *
 * Both are asserted across a spread of plans rather than one happy path,
 * because the interesting failures are the clamped, empty and lopsided cases.
 */

function explanationsFor(state: PlannerState): {
  set: ReturnType<typeof buildExplanations>;
  planResult: ReturnType<typeof computePlan>;
  ledger: ReturnType<typeof summariseLedger>;
} {
  const plan = buildPlan(state);
  const planResult = computePlan(plan);
  const { inHome, residential } = breakEvenScenarios(state);
  const breakEven = breakEvenBetween(inHome, residential);

  // Reconciled against the shares the split engine produced, exactly as the page
  // does it — the derivation must never see a different number from the UI.
  const shares: Record<string, number> = {};
  for (const share of planResult.split?.shares ?? []) {
    shares[share.contributorId] = share.monthlyCents;
  }
  const ledger = summariseLedger({
    entries: state.ledger,
    contributors: state.contributors,
    monthlySharesCents: shares,
    monthsElapsed: state.monthsElapsed,
  });

  const inputs: ExplanationInputs = {
    plan,
    result: planResult.active!,
    breakEven,
    breakEvenHourlyRateCents: aideHourlyRateCents(state.stateCode),
    breakEvenHoursPerWeek: state.compareHoursPerWeek,
    split: planResult.split,
    contributors: state.contributors,
    ledger,
    monthsElapsed: state.monthsElapsed,
  };

  return { set: buildExplanations(inputs), planResult, ledger };
}

/** A logged payment, with only the fields a test cares about spelled out. */
function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'e1',
    contributorId: 'c1',
    date: '2026-03-01',
    amountCents: 100_000,
    category: 'medication',
    taxDeductibleCandidate: false,
    ...overrides,
  };
}

/** A spread of plans chosen for their edge cases, not for their prettiness. */
const CASES: readonly { name: string; state: PlannerState }[] = [
  { name: 'the default assisted-living plan', state: INITIAL_STATE },
  {
    name: 'a plan loaded with tiers, add-ons, a community fee and everyday costs',
    state: {
      ...INITIAL_STATE,
      careLevelTierCents: 150_000,
      communityFeeCents: 400_000,
      ancillaryMonthlyCents: 45_000,
      addOns: INITIAL_STATE.addOns.map((a) => ({ ...a, enabled: true })),
    },
  },
  {
    name: 'a plan where income more than covers the cost',
    state: {
      ...INITIAL_STATE,
      careType: 'in_home_homemaker',
      hoursPerWeek: 4,
      monthlyIncomeCents: 900_000,
    },
  },
  {
    name: 'a plan with no savings and no family sharing the cost',
    state: {
      ...INITIAL_STATE,
      liquidAssetsCents: 0,
      contributorCount: 0,
      contributors: [],
    },
  },
  {
    name: 'a nursing-home plan split three ways in proportion to income',
    state: {
      ...INITIAL_STATE,
      careType: 'nursing_home_private',
      splitMethod: 'income_proportional',
      contributorCount: 3,
      contributors: makeContributors(3).map((c, i) => ({
        ...c,
        annualIncomeCents: [9_000_000, 5_500_000, 4_100_000][i],
      })),
    },
  },
  {
    name: 'a plan split by what each family member has offered, leaving a remainder',
    state: {
      ...INITIAL_STATE,
      splitMethod: 'custom',
      contributors: makeContributors(2).map((c, i) => ({
        ...c,
        monthlyPledgeCents: [50_000, 25_000][i],
        monthlyCapacityCents: 30_000,
      })),
    },
  },
  {
    name: 'an hourly in-home plan with the cost of running the home entered',
    state: {
      ...INITIAL_STATE,
      careType: 'in_home_health_aide',
      hoursPerWeek: 60,
      compareHoursPerWeek: 60,
      housingCarryMonthlyCents: 320_000,
    },
  },
  {
    name: 'a plan priced from a real quote rather than a published median',
    state: { ...INITIAL_STATE, costOverrideCents: 812_500 },
  },
  {
    name: 'an adult day care plan',
    state: { ...INITIAL_STATE, careType: 'adult_day_care' },
  },
  {
    name: 'a plan with three months of payments logged',
    state: {
      ...INITIAL_STATE,
      monthsElapsed: 3,
      ledger: [
        {
          id: 'l1', contributorId: 'c1', date: '2026-01-04', amountCents: 120_000,
          category: 'medication', taxDeductibleCandidate: true,
        },
        {
          id: 'l2', contributorId: 'c1', date: '2026-02-04', amountCents: 95_500,
          category: 'transport', taxDeductibleCandidate: false,
        },
        {
          id: 'l3', contributorId: 'c2', date: '2026-02-19', amountCents: 240_000,
          category: 'respite', note: 'Two weekends', taxDeductibleCandidate: true,
        },
      ],
    },
  },
  {
    name: 'a ledger holding a payment by someone no longer listed',
    state: {
      ...INITIAL_STATE,
      monthsElapsed: 2,
      contributorCount: 1,
      contributors: makeContributors(1),
      ledger: [
        {
          id: 'l1', contributorId: 'c1', date: '2026-01-04', amountCents: 80_000,
          category: 'supplies', taxDeductibleCandidate: true,
        },
        {
          id: 'l2', contributorId: 'c2', date: '2026-01-11', amountCents: 55_000,
          category: 'transport', taxDeductibleCandidate: false,
        },
      ],
    },
  },
];

describe('Given any plan a family can build in the app', () => {
  for (const { name, state } of CASES) {
    describe(`Given ${name}`, () => {
      it('When each derivation is read, Then the parts shown add up exactly to the total shown', () => {
        // Given the derivations for this plan
        const { set } = explanationsFor(state);

        // When each one that states a sum is checked
        for (const id of EXPLANATION_ORDER) {
          const explanation = set[id];
          if (!explanation || !hasArithmetic(explanation)) continue;

          // Then the arithmetic balances to the cent
          expect(
            additiveTotalCents(explanation),
            `${id}: parts do not sum to the stated result`,
          ).toBe(resultStep(explanation)?.valueCents);
          expect(isBalanced(explanation), `${id} is unbalanced`).toBe(true);
        }
      });

      it('When the derivations are rendered as strings, Then the displayed parts sum to the displayed total', () => {
        // Given the derivations, formatted the way the UI formats them
        const { set } = explanationsFor(state);

        for (const id of EXPLANATION_ORDER) {
          const explanation = set[id];
          if (!explanation || !hasArithmetic(explanation)) continue;

          // When the rendered strings are parsed back into numbers — the check a
          // reader actually performs, on the page rather than in the engine
          const parse = (cents: number) =>
            Math.round(parseFloat(formatCentsPrecise(cents).replace(/[$,]/g, '')) * 100);
          const parts = explanation.steps
            .filter((s) => s.kind === 'add' || s.kind === 'subtract')
            .reduce((sum, s) => sum + (s.kind === 'add' ? 1 : -1) * parse(s.valueCents ?? 0), 0);

          // Then they agree with the total as displayed
          expect(parts, `${id}: displayed parts do not sum to the displayed total`).toBe(
            parse(resultStep(explanation)?.valueCents ?? 0),
          );
        }
      });

      it('When every derivation is inspected, Then each has a formula, a result and provenance for its assumptions', () => {
        // Given the derivations
        const { set } = explanationsFor(state);

        for (const id of EXPLANATION_ORDER) {
          const explanation = set[id];
          if (!explanation) continue;

          // Then none of them is an empty shell
          expect(explanation.formula.length, `${id} has no formula`).toBeGreaterThan(0);
          expect(explanation.plainLanguage.length, `${id} has no plain-language summary`).toBeGreaterThan(0);
          expect(explanation.question.endsWith('?'), `${id} question is not a question`).toBe(true);
          expect(resultStep(explanation), `${id} states no result`).not.toBeNull();
          expect(explanation.caveats.length, `${id} claims no limitations`).toBeGreaterThan(0);
        }
      });

      it('When the copy is read, Then it stays in the neutral third-party voice', () => {
        // Given the derivations
        const { set } = explanationsFor(state);

        // When every line of prose is gathered
        const prose = EXPLANATION_ORDER.flatMap((id) => {
          const e = set[id];
          if (!e) return [];
          return [
            e.title,
            e.question,
            e.plainLanguage,
            ...e.steps.map((s) => `${s.label} ${s.workingOut ?? ''}`),
            ...e.assumptions,
            ...e.caveats,
            ...e.sources,
          ];
        }).join(' ');

        // Then it never addresses the reader — a sibling may have sent this
        // page, and the method has to read as the tool's (spec §5.4)
        expect(prose).not.toMatch(/\byou(r|rs)?\b/i);
      });
    });
  }
});

describe('Given the derivations must never become a second implementation of the engines', () => {
  it('When the cost derivations are compared with the cost engine, Then every figure matches', () => {
    // Given a plan with fees on every line
    const state: PlannerState = {
      ...INITIAL_STATE,
      careLevelTierCents: 150_000,
      communityFeeCents: 400_000,
      ancillaryMonthlyCents: 45_000,
      addOns: INITIAL_STATE.addOns.map((a) => ({ ...a, enabled: true })),
    };

    // When the derivations are built
    const { set, planResult } = explanationsFor(state);
    const cost = planResult.active!.cost;

    // Then they restate the engine rather than recomputing it
    expect(resultStep(set['base-rate']!)?.valueCents).toBe(cost.advertisedBaseCents);
    expect(resultStep(set['all-in']!)?.valueCents).toBe(cost.allInMonthlyCents);
    expect(resultStep(set['first-month']!)?.valueCents).toBe(cost.firstMonthCents);
    expect(resultStep(set['monthly-gap']!)?.valueCents).toBe(
      planResult.active!.runway.monthlyShortfallCents,
    );
    expect(resultStep(set.split!)?.valueCents).toBe(planResult.split!.totalCents);
  });

  it('When a fee is added, Then the derivation moves with the engine rather than staying put', () => {
    // Given a plan with no care-level surcharge
    const before = explanationsFor(INITIAL_STATE);

    // When a surcharge is added
    const after = explanationsFor({ ...INITIAL_STATE, careLevelTierCents: 150_000 });

    // Then the derivation's total rises by exactly the surcharge
    const beforeTotal = resultStep(before.set['all-in']!)!.valueCents!;
    const afterTotal = resultStep(after.set['all-in']!)!.valueCents!;
    expect(afterTotal - beforeTotal).toBe(150_000);
    expect(afterTotal).toBe(after.planResult.active!.cost.allInMonthlyCents);
  });
});

describe('Given income that more than covers the cost of care', () => {
  it('When the gap is derived, Then the clamp at zero is shown as a step rather than left as a discrepancy', () => {
    // Given a plan whose income exceeds its care cost
    const state: PlannerState = {
      ...INITIAL_STATE,
      careType: 'in_home_homemaker',
      hoursPerWeek: 4,
      monthlyIncomeCents: 900_000,
    };

    // When the monthly-gap derivation is built
    const { set, planResult } = explanationsFor(state);
    const gap = set['monthly-gap']!;

    // Then the result is zero, the parts still balance, and the reason is stated
    expect(planResult.active!.runway.monthlyShortfallCents).toBe(0);
    expect(resultStep(gap)?.valueCents).toBe(0);
    expect(isBalanced(gap)).toBe(true);
    expect(gap.steps.some((s) => s.label.includes('held at zero'))).toBe(true);
  });
});

describe('Given a family splitting the cost three ways in proportion to income', () => {
  it('When the split derivation is read, Then each share shows the fraction it came from and the shares sum to the gap', () => {
    // Given three siblings on different incomes
    const state: PlannerState = {
      ...INITIAL_STATE,
      splitMethod: 'income_proportional',
      contributorCount: 3,
      contributors: makeContributors(3).map((c, i) => ({
        ...c,
        annualIncomeCents: [9_000_000, 5_500_000, 4_100_000][i],
      })),
    };

    // When the split derivation is built
    const { set, planResult } = explanationsFor(state);
    const split = set.split!;

    // Then each share shows its working, and the total is the gap to the cent
    const shareSteps = split.steps.filter((s) => s.kind === 'add');
    expect(shareSteps).toHaveLength(3);
    for (const step of shareSteps) {
      expect(step.workingOut).toContain('÷');
    }
    expect(resultStep(split)?.valueCents).toBe(planResult.active!.runway.monthlyShortfallCents);
  });
});

describe('Given a plan priced from a real quote', () => {
  it('When the base-rate derivation is read, Then it says a quote replaced the published median', () => {
    // Given a quoted price
    const { set } = explanationsFor({ ...INITIAL_STATE, costOverrideCents: 812_500 });

    // When the base-rate derivation is read
    const baseRate = set['base-rate']!;

    // Then the provenance names the quote rather than the survey
    expect(resultStep(baseRate)?.valueCents).toBe(812_500);
    expect(baseRate.sources.join(' ')).toContain('quoted');
    expect(baseRate.sources.join(' ')).not.toContain('Cost of Care Survey');
  });
});

describe('Given care at home priced by the hour', () => {
  it('When the base rate is derived, Then the month is 52 ÷ 12 weeks rather than four', () => {
    // Given 60 hours a week of in-home care
    const { set, planResult } = explanationsFor({
      ...INITIAL_STATE,
      careType: 'in_home_health_aide',
      hoursPerWeek: 60,
    });

    // When the base-rate derivation is read
    const baseRate = set['base-rate']!;

    // Then the working shows the weeks-per-month conversion explicitly
    expect(baseRate.formula).toContain('52 weeks ÷ 12 months');
    expect(resultStep(baseRate)?.workingOut).toContain('60 hours');
    expect(resultStep(baseRate)?.valueCents).toBe(planResult.active!.cost.advertisedBaseCents);
  });
});

describe('Given a published figure the app is not fully confident in', () => {
  it('When memory care is chosen, Then the derivation says the figure is derived rather than surveyed', () => {
    // Given memory care, which is not a surveyed category
    const { set } = explanationsFor({ ...INITIAL_STATE, careType: 'memory_care' });

    // When the sources are read
    const sources = set['base-rate']!.sources.join(' ');

    // Then the weaker basis is disclosed rather than laundered into confidence
    expect(sources).toContain('not separately surveyed');
    expect(sources).toContain('placeholder');
  });
});

describe('Given a family logging what each of them has actually paid', () => {
  const state: PlannerState = {
    ...INITIAL_STATE,
    monthsElapsed: 3,
    ledger: [
      entry({ id: 'l1', contributorId: 'c1', amountCents: 120_000, taxDeductibleCandidate: true }),
      entry({ id: 'l2', contributorId: 'c1', amountCents: 95_500, category: 'transport' }),
      entry({ id: 'l3', contributorId: 'c2', amountCents: 240_000, category: 'respite' }),
    ],
  };

  it('When the ledger derivation is read, Then its total is the engine’s total and the parts are the per-person totals', () => {
    // Given three logged payments across two family members
    const { set, ledger } = explanationsFor(state);
    const explanation = set.ledger!;

    // When the derivation is read
    const parts = explanation.steps.filter((s) => s.kind === 'add');

    // Then it restates the engine rather than re-adding the entries itself
    expect(resultStep(explanation)?.valueCents).toBe(ledger.totalPaidCents);
    expect(ledger.totalPaidCents).toBe(455_500);
    expect(parts).toHaveLength(2);
    expect(parts.map((p) => p.valueCents)).toEqual([215_500, 240_000]);
    expect(isBalanced(explanation)).toBe(true);
  });

  it('When the reconciliation is read, Then each person’s expected amount shows the multiplication behind it', () => {
    // Given a share of $1,850 a month over three months
    const { set, ledger } = explanationsFor(state);
    const notes = set.ledger!.steps.filter((s) => s.kind === 'note').map((s) => s.label);

    // When the per-person lines are read
    const first = ledger.reconciliation[0];

    // Then the working is written out, not just the answer
    const line = notes.find((n) => n.startsWith(first.name));
    expect(line).toContain(formatCentsPrecise(first.pledgedMonthlyCents));
    expect(line).toContain('× 3 months');
    expect(line).toContain(formatCentsPrecise(first.expectedToDateCents));
    expect(line).toMatch(/ahead of the plan|behind the plan|level with the plan/);
  });

  it('When a payment is logged, Then the derivation moves with the engine rather than staying put', () => {
    // Given the ledger as it stands
    const before = explanationsFor(state);

    // When another $500 payment is logged
    const after = explanationsFor({
      ...state,
      ledger: [...state.ledger, entry({ id: 'l4', contributorId: 'c2', amountCents: 50_000 })],
    });

    // Then the derivation's total rises by exactly that payment
    const beforeTotal = resultStep(before.set.ledger!)!.valueCents!;
    const afterTotal = resultStep(after.set.ledger!)!.valueCents!;
    expect(afterTotal - beforeTotal).toBe(50_000);
    expect(afterTotal).toBe(after.ledger.totalPaidCents);
  });

  it('When entries are ticked as medical expenses, Then the total is stated as a candidate rather than a determination', () => {
    // Given one entry ticked
    const { set, ledger } = explanationsFor(state);

    // When the note about medical expenses is read
    const note = set
      .ledger!.steps.filter((s) => s.kind === 'note')
      .map((s) => s.label)
      .find((l) => l.includes('medical expenses'));

    // Then it reports the tick, and refuses to call it deductible
    expect(ledger.deductibleCandidateCents).toBe(120_000);
    expect(note).toContain(formatCentsPrecise(120_000));
    expect(note).toContain('not a determination');
  });
});

describe('Given payments logged against someone who is no longer sharing the cost', () => {
  it('When the ledger is derived, Then their payments are kept in the total and named rather than dropped', () => {
    // Given two people who paid, and only one still listed
    const { set, ledger } = explanationsFor({
      ...INITIAL_STATE,
      monthsElapsed: 2,
      contributorCount: 1,
      contributors: makeContributors(1),
      ledger: [
        entry({ id: 'l1', contributorId: 'c1', amountCents: 80_000 }),
        entry({ id: 'l2', contributorId: 'c2', amountCents: 55_000, category: 'transport' }),
      ],
    });
    const explanation = set.ledger!;

    // When the derivation is read
    const orphanStep = explanation.steps.find((s) => s.label.includes('no longer listed'));

    // Then the money is still in the total, and the arithmetic still balances
    expect(ledger.totalPaidCents).toBe(135_000);
    expect(orphanStep?.valueCents).toBe(55_000);
    expect(isBalanced(explanation)).toBe(true);
    expect(resultStep(explanation)?.valueCents).toBe(135_000);
  });
});

describe('Given a plan where nothing has been logged yet', () => {
  it('When the ledger derivation is built, Then it reports an empty ledger rather than inventing one', () => {
    // Given no entries
    const { set, ledger } = explanationsFor(INITIAL_STATE);
    const explanation = set.ledger!;

    // Then the totals are zero and the derivation still balances
    expect(ledger.entryCount).toBe(0);
    expect(resultStep(explanation)?.valueCents).toBe(0);
    expect(isBalanced(explanation)).toBe(true);
    expect(explanation.steps.filter((s) => s.kind === 'add')).toHaveLength(2);
  });
});

describe('Given every headline figure on the results screen', () => {
  it('When the explanation set is built, Then one exists for each of them', () => {
    // Given the default plan
    const { set } = explanationsFor(INITIAL_STATE);

    // Then every id the UI can ask for resolves
    const required: ExplanationId[] = [
      'base-rate',
      'all-in',
      'first-month',
      'monthly-gap',
      'runway',
      'break-even',
      'split',
      'ledger',
      'sensitivity',
    ];
    for (const id of required) {
      expect(set[id], `${id} is missing`).not.toBeNull();
    }
    expect([...EXPLANATION_ORDER].sort()).toEqual([...required].sort());
  });

  it('When there are no family members sharing the cost, Then the split derivation is withheld rather than faked', () => {
    // Given a plan nobody is sharing
    const { set } = explanationsFor({
      ...INITIAL_STATE,
      contributorCount: 0,
      contributors: [],
    });

    // Then the split explanation exists but describes an empty division
    const split = set.split as Explanation;
    expect(split.steps.filter((s) => s.kind === 'add')).toHaveLength(0);
    expect(resultStep(split)?.valueCents).toBe(0);
  });
});
