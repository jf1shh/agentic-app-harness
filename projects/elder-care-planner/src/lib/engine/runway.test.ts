/**
 * Unit tests for the Runway Engine.
 *
 * Every expected value below is hand-computed, with the arithmetic written out
 * in the comment (spec §8). Snapshotting the implementation's own output would
 * prove only that the code is self-consistent, which is exactly the failure mode
 * that would hurt a family relying on these numbers.
 */
import { describe, it, expect } from 'vitest';
import { computeRunway, incomeAtMonth, type RunwayAsset, type RunwayInput } from './runway';
import type { IncomeSource } from '../schemas';

function income(overrides: Partial<IncomeSource> = {}): IncomeSource {
  return {
    id: 'i1',
    label: 'Social Security',
    kind: 'social_security',
    monthlyCents: 300_000,
    colaRate: 0,
    eliminationPeriodDays: 0,
    ...overrides,
  };
}

function asset(overrides: Partial<RunwayAsset> = {}): RunwayAsset {
  return {
    id: 'a1',
    label: 'Savings',
    kind: 'cash',
    balanceCents: 1_200_000,
    annualReturnRate: 0,
    liquid: true,
    ...overrides,
  };
}

function baseInput(overrides: Partial<RunwayInput> = {}): RunwayInput {
  return {
    allInMonthlyCents: 500_000, // $5,000/mo
    oneTimeCents: 0,
    annualEscalatorRate: 0,
    ancillaryMonthlyCents: 0,
    generalInflationRate: 0,
    income: [income()], // $3,000/mo
    assets: [asset()], // $12,000
    projectionYears: 10,
    ...overrides,
  };
}

describe('Given care costs $5,000/mo, income of $3,000/mo and $12,000 in savings', () => {
  it('When projected, Then savings cover the $2,000 gap for six months and fail in month seven', () => {
    // Gap = 500000 - 300000 = 200000/mo. 1200000 / 200000 = 6 full months.
    // Month 6 draws the balance to exactly zero; month 7 is the first month the
    // money is not there.
    const result = computeRunway(baseInput());
    expect(result.depletionMonth).toBe(7);
    expect(result.monthlyShortfallCents).toBe(200_000);
    expect(result.firstMonthTotalCents).toBe(500_000);
  });

  it('When the family starts paying, Then the contributor burden begins at depletion', () => {
    expect(computeRunway(baseInput()).contributorBurdenStartMonth).toBe(7);
  });

  it('When the whole projection is totalled, Then out-of-pocket is the gap times 120 months', () => {
    // 200000 * 120 = 24,000,000 cents = $240,000
    expect(computeRunway(baseInput()).totalOutOfPocketCents).toBe(24_000_000);
  });
});

describe('Given income that covers the full cost of care', () => {
  it('When projected, Then the money never runs out and null is returned, not zero', () => {
    const result = computeRunway(baseInput({ income: [income({ monthlyCents: 600_000 })] }));
    expect(result.depletionMonth).toBeNull();
    expect(result.totalOutOfPocketCents).toBe(0);
    expect(result.contributorBurdenStartMonth).toBeNull();
  });
});

describe('Given no savings at all', () => {
  it('When projected, Then the plan is unfunded from month one', () => {
    expect(computeRunway(baseInput({ assets: [] })).depletionMonth).toBe(1);
  });
});

describe('Given a one-time community fee of $4,000', () => {
  it('When projected, Then it is charged in month one only and pulls depletion forward', () => {
    // Month 1: cost 500000 + 400000 = 900000, gap 600000. Assets 1000000 -> 400000.
    // Month 2: gap 200000 -> 200000. Month 3: gap 200000 -> 0. Month 4 fails.
    const result = computeRunway(
      baseInput({ oneTimeCents: 400_000, assets: [asset({ balanceCents: 1_000_000 })] }),
    );
    expect(result.depletionMonth).toBe(4);
    expect(result.firstMonthTotalCents).toBe(900_000);
    // The recurring gap excludes the one-time fee, so the sibling split is not
    // inflated by a cost that happens once.
    expect(result.monthlyShortfallCents).toBe(200_000);
  });
});

describe('Given a long-term care policy with a 90-day wait and a 12-month benefit period', () => {
  const ltc = income({
    id: 'ltc',
    kind: 'ltc_insurance',
    monthlyCents: 100_000,
    eliminationPeriodDays: 90,
    endsAfterMonths: 12,
  });

  it('When inside the elimination period, Then the policy pays nothing', () => {
    expect(incomeAtMonth(ltc, 1)).toBe(0);
    expect(incomeAtMonth(ltc, 3)).toBe(0);
  });

  it('When the wait has elapsed, Then the benefit starts in month four', () => {
    expect(incomeAtMonth(ltc, 4)).toBe(100_000);
  });

  it('When the benefit period expires, Then payments stop mid-projection', () => {
    // Pays months 4..15 inclusive (12 months of benefit), then stops.
    expect(incomeAtMonth(ltc, 15)).toBe(100_000);
    expect(incomeAtMonth(ltc, 16)).toBe(0);
  });
});

describe('Given income with a cost-of-living adjustment', () => {
  it('When a year boundary passes, Then the COLA compounds annually, not monthly', () => {
    const src = income({ monthlyCents: 100_000, colaRate: 0.1 });
    expect(incomeAtMonth(src, 1)).toBe(100_000);
    expect(incomeAtMonth(src, 12)).toBe(100_000); // still year index 0
    expect(incomeAtMonth(src, 13)).toBe(110_000); // year index 1
    expect(incomeAtMonth(src, 25)).toBe(121_000); // year index 2
  });
});

describe('Given a 10% annual escalator on care costs', () => {
  it('When years roll over, Then the cost compounds at the year boundary', () => {
    const result = computeRunway(
      baseInput({
        annualEscalatorRate: 0.1,
        income: [],
        assets: [asset({ balanceCents: 100_000_000 })],
        projectionYears: 2,
      }),
    );
    // Year 1: 500000 * 12 = 6,000,000. Year 2: 550000 * 12 = 6,600,000.
    expect(result.yearlyBreakdown[0].careCostCents).toBe(6_000_000);
    expect(result.yearlyBreakdown[1].careCostCents).toBe(6_600_000);
  });
});

describe('Given a care-level increase scheduled for month 13', () => {
  it('When the month arrives, Then the monthly cost steps up from that month on', () => {
    const result = computeRunway(
      baseInput({
        careLevelIncrease: { atMonth: 13, cents: 100_000 },
        income: [],
        assets: [asset({ balanceCents: 100_000_000 })],
        projectionYears: 2,
      }),
    );
    // Year 1 unaffected: 500000 * 12 = 6,000,000.
    expect(result.yearlyBreakdown[0].careCostCents).toBe(6_000_000);
    // Year 2 at 600000/mo: 7,200,000.
    expect(result.yearlyBreakdown[1].careCostCents).toBe(7_200_000);
  });
});

describe('Given savings invested at a negative return', () => {
  it('When a month passes, Then the loss is applied before the withdrawal', () => {
    const result = computeRunway(
      baseInput({
        assets: [asset({ balanceCents: 1_000_000, annualReturnRate: -0.12 })],
        projectionYears: 1,
      }),
    );
    // Month 1: 1000000 * (1 - 0.12/12) = 990000, then draw 200000 -> 790000.
    // M2: 782100 -> 582100. M3: 576279 -> 376279. M4: 372516.21 -> 172516.21.
    // M5: 170791.05 grows short of the 200000 draw, so month 5 is the first
    // month the money is not there — a month earlier than the flat-return case.
    expect(result.depletionMonth).toBe(5);
  });
});

describe('Given wealth that is tied up in the family home', () => {
  it('When the home is not marked liquid, Then it does not fund care', () => {
    const result = computeRunway(
      baseInput({
        assets: [
          asset({ id: 'cash', balanceCents: 0 }),
          asset({ id: 'home', kind: 'home_equity', balanceCents: 50_000_000, liquid: false }),
        ],
      }),
    );
    // Selling the house is a decision, not an assumption the planner may make.
    expect(result.depletionMonth).toBe(1);
  });

  it('When the family marks it liquid, Then it is drawn last, after cash', () => {
    const result = computeRunway(
      baseInput({
        assets: [
          asset({ id: 'cash', balanceCents: 200_000 }),
          asset({ id: 'home', kind: 'home_equity', balanceCents: 1_000_000, liquid: true }),
        ],
      }),
    );
    // Total liquid 1,200,000 at 200,000/mo = 6 months, failing in month 7.
    expect(result.depletionMonth).toBe(7);
  });
});

describe('Given a home sale expected to complete in month 3 (spec §11.16)', () => {
  it('When the month arrives, Then the net proceeds land in that month and fund the shortfall from then on', () => {
    const result = computeRunway(
      baseInput({
        income: [],
        assets: [],
        homeSaleProceeds: { atMonth: 3, netCents: 2_000_000 }, // $20,000
        projectionYears: 1,
      }),
    );
    // Months 1-2: $5,000/mo shortfall, nothing to draw from yet.
    expect(result.monthlyBreakdown[0].assetsEndCents).toBe(0);
    expect(result.monthlyBreakdown[1].assetsEndCents).toBe(0);
    expect(result.depletionMonth).toBe(1);

    // Month 3: 2,000,000 arrives, 500,000 is drawn for that month's cost ->
    // 1,500,000 left.
    expect(result.monthlyBreakdown[2].assetsEndCents).toBe(1_500_000);
    // Month 4: 1,500,000 - 500,000 = 1,000,000.
    expect(result.monthlyBreakdown[3].assetsEndCents).toBe(1_000_000);
  });

  it('When no home sale is entered, Then the projection is unaffected — this is strictly additive', () => {
    const withField = computeRunway(baseInput({ homeSaleProceeds: undefined }));
    const withoutField = computeRunway(baseInput());
    expect(withField).toEqual(withoutField);
  });

  it('When the sale month is beyond the projection horizon, Then it has no effect rather than throwing', () => {
    const result = computeRunway(
      baseInput({
        assets: [],
        homeSaleProceeds: { atMonth: 200, netCents: 2_000_000 },
        projectionYears: 1, // only 12 months are simulated
      }),
    );
    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(result.monthlyBreakdown[11].assetsEndCents).toBe(0);
  });
});

describe('Given contributors who have stated what they can afford', () => {
  it('When the required contribution exceeds capacity, Then borrowing is flagged', () => {
    const result = computeRunway(
      baseInput({ assets: [], contributorCapacityCents: 50_000 }),
    );
    // Gap of 200000/mo against a stated capacity of 50000 means debt from month one.
    expect(result.borrowingStartMonth).toBe(1);
  });

  it('When capacity covers the gap, Then no borrowing is flagged', () => {
    const result = computeRunway(
      baseInput({ assets: [], contributorCapacityCents: 300_000 }),
    );
    expect(result.borrowingStartMonth).toBeNull();
    expect(result.contributorBurdenStartMonth).toBe(1);
  });
});

describe('Given a chart needs the depletion curve month by month', () => {
  it('When the runway is computed, Then a row exists for every projected month', () => {
    // 10 projection years x 12 = 120 months, numbered 1..120.
    const result = computeRunway(baseInput());
    expect(result.monthlyBreakdown).toHaveLength(120);
    expect(result.monthlyBreakdown[0].month).toBe(1);
    expect(result.monthlyBreakdown[119].month).toBe(120);
    expect(result.projectionMonths).toBe(120);
  });

  it('When both series are read, Then the yearly rows equal the monthly rows at each year boundary', () => {
    // This is the invariant that stops the two series drifting: the yearly
    // figure must be the monthly figure sampled, never a second accumulation.
    // A chart and a table on the same screen would otherwise disagree.
    const result = computeRunway(
      baseInput({
        assets: [asset({ balanceCents: 100_000_000, annualReturnRate: 0.04 })],
        annualEscalatorRate: 0.04,
        generalInflationRate: 0.03,
        ancillaryMonthlyCents: 40_000,
      }),
    );
    for (const year of result.yearlyBreakdown) {
      const boundary = result.monthlyBreakdown[year.year * 12 - 1];
      expect(
        boundary.assetsEndCents,
        `year ${year.year} assets-end disagrees with month ${year.year * 12}`,
      ).toBe(year.assetsEndCents);
    }
  });

  it('When the monthly rows are read, Then month one carries the one-time costs and later months do not', () => {
    // Hand-computed: month 1 = 500_000 care + 250_000 one-time = 750_000.
    // Month 2 = 500_000, with no escalator or inflation applied.
    const result = computeRunway(baseInput({ oneTimeCents: 250_000 }));
    expect(result.monthlyBreakdown[0].careCostCents).toBe(750_000);
    expect(result.monthlyBreakdown[1].careCostCents).toBe(500_000);
  });

  it('When savings run out, Then the curve reaches zero and stays there rather than going negative', () => {
    // Gap = 200_000/mo against 1_200_000 of savings: zero from month 6 on.
    const result = computeRunway(baseInput());
    expect(result.monthlyBreakdown[5].assetsEndCents).toBe(0);
    for (const month of result.monthlyBreakdown) {
      expect(month.assetsEndCents).toBeGreaterThanOrEqual(0);
    }
  });
});
