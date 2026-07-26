/**
 * BDD-format Vitest suite for the buy-in & refund engine (spec §6.5b).
 *
 * Per `.agents/AGENTS.md` §8 (and the existing runway.test.ts / sensitivity.test.ts
 * discipline), every golden fixture here is HAND-COMPUTED by a human, with the
 * arithmetic written out in the test comments. Values captured from the
 * implementation output would only prove the code agrees with itself.
 *
 * Money is integer cents throughout. The §6 lesson "Format a Total and Its
 * Parts at the Same Precision" is honored by never producing values that
 * differ across the cost / runway / buy-in engines.
 */
import { describe, it, expect } from 'vitest';
import type { BuyInContract, CareScenario, Plan } from '../schemas';
import {
  resolveRefundAtTenure,
  buyInAffordability,
  projectILVariants,
} from './buyin';

/** Option A's contract: $400 000 entry with the canonical 12/36/60/84
 *  month refund ladder (80/60/30/0 percent). Hand-computed from community
 *  brochure patterns, NOT from running the implementation.
 */
const CONTRACT_A: BuyInContract = {
  entryCents: 40_000_000, // $400,000
  amortized: false,
  refundSchedule: [
    { tenureMonths: 12, refundPercent: 80 },
    { tenureMonths: 36, refundPercent: 60 },
    { tenureMonths: 60, refundPercent: 30 },
    { tenureMonths: 84, refundPercent: 0 },
  ],
  monthlyServiceCentsRate: 0,
};

describe('Given a BuyInContract with a refund schedule (Option A)', () => {
  describe('When resolving the refund at a specific tenure', () => {
    it('Then pays the bracket-percent × entryCents at the highest qualifying bracket', () => {
      // Hand-computed: 37 months falls into the 36-month bracket (60%).
      // 40,000,000 × 60 / 100 = 24,000,000 cents = $240,000.
      expect(resolveRefundAtTenure(CONTRACT_A, 37)).toBe(24_000_000);
    });

    it('Then pays 0 below the first bracket', () => {
      // Hand-computed: 11 months is below the 12-month threshold, so the
      // schedule never applies. Refund = 0.
      expect(resolveRefundAtTenure(CONTRACT_A, 11)).toBe(0);
      expect(resolveRefundAtTenure(CONTRACT_A, 0)).toBe(0);
    });

    it('Then pays 0 at the terminal 0% bracket', () => {
      // Hand-computed: 84 months and beyond apply the 0% row, so refund = 0.
      expect(resolveRefundAtTenure(CONTRACT_A, 84)).toBe(0);
      expect(resolveRefundAtTenure(CONTRACT_A, 200)).toBe(0);
    });

    it('Then applies the largest qualifying bracket when tenure crosses multiple rows', () => {
      // Hand-computed: 24 months is past 12m but not 36m, so 80% applies.
      // 40,000,000 × 80 / 100 = 32,000,000 cents = $320,000.
      expect(resolveRefundAtTenure(CONTRACT_A, 24)).toBe(32_000_000);

      // Hand-computed: 60 months exactly hits the 30% row.
      // 40,000,000 × 30 / 100 = 12,000,000 cents = $120,000.
      expect(resolveRefundAtTenure(CONTRACT_A, 60)).toBe(12_000_000);
    });
  });

  describe('When the contract is amortized (Option B)', () => {
    it('Then refund is always 0 regardless of tenure', () => {
      // Hand-computed: amortized contracts make 0 refund guarantees, no matter
      // the tenure. The schedule is irrelevant.
      const amortized: BuyInContract = { ...CONTRACT_A, amortized: true };
      expect(resolveRefundAtTenure(amortized, 1)).toBe(0);
      expect(resolveRefundAtTenure(amortized, 36)).toBe(0);
      expect(resolveRefundAtTenure(amortized, 200)).toBe(0);
    });
  });

  describe('When the contract has no schedule', () => {
    it('Then refund is 0 for any tenure', () => {
      const noSchedule: BuyInContract = {
        entryCents: 40_000_000,
        amortized: false,
        refundSchedule: [],
        monthlyServiceCentsRate: 0,
      };
      expect(resolveRefundAtTenure(noSchedule, 60)).toBe(0);
    });
  });
});

describe('Given liquid assets and an entry fee (affordability check)', () => {
  it('Then affordable is true iff liquidAssetsCents ≥ entryCents', () => {
    // Hand-computed: 30m < 40m → false. 40m ≥ 40m → true. 60m > 40m → true.
    expect(buyInAffordability(30_000_000, CONTRACT_A).affordable).toBe(false);
    expect(buyInAffordability(40_000_000, CONTRACT_A).affordable).toBe(true);
    expect(buyInAffordability(60_000_000, CONTRACT_A).affordable).toBe(true);
  });

  it('Then shortfallCents is max(0, entryCents − liquidAssetsCents)', () => {
    // Hand-computed: 40,000,000 − 30,000,000 = 10,000,000.
    expect(buyInAffordability(30_000_000, CONTRACT_A).shortfallCents).toBe(10_000_000);
    // Hand-computed: 0 when affordable.
    expect(buyInAffordability(60_000_000, CONTRACT_A).shortfallCents).toBe(0);
  });
});

describe('Given three IL scenarios in a Plan (overlay-chart projection)', () => {
  it('Then projectILVariants surfaces one row per scenario with assets-end and refund-at-exit per year', () => {
    const plan: Plan = {
      schemaVersion: 1,
      careRecipientLabel: 'Mom',
      scenarios: [],
      activeScenarioId: undefined,
      income: [],
      assets: [
        {
          id: 'cash',
          label: 'Cash',
          kind: 'cash',
          balanceCents: 100_000_000, // $1M cash on hand
          annualReturnRate: 0.04,
          liquid: true,
        },
      ],
      contributors: [],
      ledger: [],
      caregiverImpacts: [],
      assumptions: {
        careInflationRate: 0.04,
        generalInflationRate: 0.03,
        projectionYears: 5,
        splitMethod: 'equal',
      },
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const contractOptionA: BuyInContract = {
      ...CONTRACT_A,
      monthlyServiceCentsRate: 350_000, // $3,500/mo recurring
    };
    const contractOptionB: BuyInContract = {
      entryCents: 20_000_000, // $200,000
      amortized: true,
      refundSchedule: [],
      monthlyServiceCentsRate: 450_000, // $4,500/mo recurring
    };
    const contractOptionC: BuyInContract = {
      entryCents: 0,
      amortized: false,
      refundSchedule: [],
      monthlyServiceCentsRate: 600_000, // $6,000/mo recurring
    };

    // costOverrideCents is deliberately NOT set: with override = undefined,
    // `computeCost` falls through to the IL-buy-in branch (`monthlyService` =
    // `buyInContract.monthlyServiceCentsRate`), which is exactly the contract
    // path we are testing in this scenario.
    const scenario = (
      id: string,
      label: string,
      contract: BuyInContract,
    ): CareScenario => ({
      id,
      label,
      careType: 'independent_living',
      stateCode: 'US',
      fees: {
        communityFeeCents: 0,
        careLevelTierCents: 0,
        annualEscalatorRate: 0.04,
        addOns: [],
        buyInContract: contract,
      },
      ancillary: [],
    });

    const projections = projectILVariants(plan, [
      scenario('a', 'A — $400k buy-in, refund schedule', contractOptionA),
      scenario('b', 'B — $200k buy-in, no refund', contractOptionB),
      scenario('c', 'C — rental only, $6k/mo', contractOptionC),
    ]);

    // One row per scenario.
    expect(projections).toHaveLength(3);

    // Entry-fee PART is what each contract says, all in cents.
    expect(projections[0].buyInEntryCents).toBe(40_000_000);
    expect(projections[1].buyInEntryCents).toBe(20_000_000);
    expect(projections[2].buyInEntryCents).toBe(0);

    // All three are affordable against $1M liquid assets.
    expect(projections[0].isAffordable).toBe(true);
    expect(projections[1].isAffordable).toBe(true);
    expect(projections[2].isAffordable).toBe(true);

    // All-in monthly reads through the buy-in contract's
    // `monthlyServiceCentsRate` (cost engine §6.5b path) because no override
    // is set. tier + addOns + ancillary are all zero on these scenarios, so
    // `allInMonthlyCents` equals the contract rate exactly.
    // Hand-computed from the fixture:
    //   A: 350_000 cents ($3,500/mo)
    //   B: 450_000 cents ($4,500/mo)
    //   C: 600_000 cents ($6,000/mo)
    expect(projections[0].allInMonthlyCents).toBe(350_000);
    expect(projections[1].allInMonthlyCents).toBe(450_000);
    expect(projections[2].allInMonthlyCents).toBe(600_000);

    // Option A's hypothetical refund-at-exit per year:
    //   year 1 (12 months)  → 80% of 40m = 32m
    //   year 2 (24 months)  → 80% of 40m = 32m
    //   year 3 (36 months)  → 60% of 40m = 24m
    //   year 4 (48 months)  → 60% of 40m = 24m
    //   year 5 (60 months)  → 30% of 40m = 12m
    expect(projections[0].refundAtExitByYearCents).toEqual([
      32_000_000,
      32_000_000,
      24_000_000,
      24_000_000,
      12_000_000,
    ]);

    // Option B is amortized → refund row is all zeros.
    expect(projections[1].refundAtExitByYearCents).toEqual([0, 0, 0, 0, 0]);

    // Option C has no entry and no schedule → refund row is all zeros.
    expect(projections[2].refundAtExitByYearCents).toEqual([0, 0, 0, 0, 0]);

    // assetsEndByYearCents: every option drew its entryCents + monthly
    // out of the $1M cash pot, so all three are positive and strictly
    // decreasing. Exact cents depend on inflation + return; the invariant
    // to test here is shape (5 rows, monotone non-increasing, ends above
    // zero) — exact values are covered by the runway engine's own suite.
    for (const projection of projections) {
      expect(projection.assetsEndByYearCents).toHaveLength(5);
      const lastIndex = projection.assetsEndByYearCents.length - 1;
      expect(projection.assetsEndByYearCents[0]).toBeGreaterThan(
        projection.assetsEndByYearCents[lastIndex],
      );
      expect(projection.assetsEndByYearCents[lastIndex]).toBeGreaterThan(0);
    }
  });

  it('Then an unaffordable option is hard-flagged on the projection', () => {
    // Hand-computed: family has $250k of liquid cash, but Option A's entry
    // is $400k. The projection must surface `isAffordable: false` so the UI
    // can hard-block the option and show the explainer.
    const plan: Plan = {
      schemaVersion: 1,
      careRecipientLabel: 'Mom',
      scenarios: [],
      activeScenarioId: undefined,
      income: [],
      assets: [
        {
          id: 'cash',
          label: 'Cash',
          kind: 'cash',
          balanceCents: 25_000_000, // $250k
          annualReturnRate: 0.04,
          liquid: true,
        },
      ],
      contributors: [],
      ledger: [],
      caregiverImpacts: [],
      assumptions: {
        careInflationRate: 0.04,
        generalInflationRate: 0.03,
        projectionYears: 5,
        splitMethod: 'equal',
      },
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const scenarioOptionA: CareScenario = {
      id: 'a',
      label: 'A — $400k buy-in, refund schedule',
      careType: 'independent_living',
      stateCode: 'US',
      costOverrideCents: 0,
      fees: {
        communityFeeCents: 0,
        careLevelTierCents: 0,
        annualEscalatorRate: 0.04,
        addOns: [],
        buyInContract: { ...CONTRACT_A, monthlyServiceCentsRate: 350_000 },
      },
      ancillary: [],
    };

    const projections = projectILVariants(plan, [scenarioOptionA]);
    expect(projections[0].isAffordable).toBe(false);
    expect(projections[0].buyInEntryCents).toBe(40_000_000);
  });

  it('Then a scenario that is not independent living is skipped rather than given a row', () => {
    // Given an assisted-living scenario alongside a genuine IL option — a
    // non-IL option has no contract to compare, so a row for it would claim
    // `isAffordable: true` and a zero refund schedule as though those were
    // answers rather than absences.
    const plan: Plan = {
      schemaVersion: 1,
      careRecipientLabel: 'Mom',
      scenarios: [],
      activeScenarioId: undefined,
      income: [],
      assets: [
        {
          id: 'cash', label: 'Cash', kind: 'cash', balanceCents: 100_000_000,
          annualReturnRate: 0.04, liquid: true,
        },
      ],
      contributors: [],
      ledger: [],
      caregiverImpacts: [],
      assumptions: {
        careInflationRate: 0.04, generalInflationRate: 0.03,
        projectionYears: 5, splitMethod: 'equal',
      },
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const assistedLiving: CareScenario = {
      id: 'al',
      label: 'Assisted living',
      careType: 'assisted_living',
      stateCode: 'US',
      fees: {
        communityFeeCents: 400_000,
        careLevelTierCents: 0,
        annualEscalatorRate: 0.04,
        addOns: [],
        // A contract left behind on a non-IL scenario must not be projected.
        buyInContract: { ...CONTRACT_A, monthlyServiceCentsRate: 350_000 },
      },
      ancillary: [],
    };
    const independentLiving: CareScenario = {
      id: 'il',
      label: 'Independent living, Option A',
      careType: 'independent_living',
      stateCode: 'US',
      fees: {
        communityFeeCents: 0,
        careLevelTierCents: 0,
        annualEscalatorRate: 0.04,
        addOns: [],
        buyInContract: { ...CONTRACT_A, monthlyServiceCentsRate: 350_000 },
      },
      ancillary: [],
    };

    const projections = projectILVariants(plan, [assistedLiving, independentLiving]);

    // Then only the IL option is projected, and rows are found by id not index
    expect(projections).toHaveLength(1);
    expect(projections[0].scenarioId).toBe('il');
    expect(projections.some((p) => p.scenarioId === 'al')).toBe(false);
  });
});

