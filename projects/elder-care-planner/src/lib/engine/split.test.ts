/**
 * Unit tests for the Family Cost-Sharing Split.
 *
 * The exact-sum property is the important one here. A split that loses a cent
 * is precisely what a family notices, and it undermines the app's whole reason
 * for producing the numbers instead of a sibling.
 */
import { describe, it, expect } from 'vitest';
import { computeSplit, distributeCents } from './split';
import type { Contributor } from '../schemas';

function contributor(overrides: Partial<Contributor> = {}): Contributor {
  return {
    id: 'c1',
    name: 'Sibling A',
    providesUnpaidHoursPerWeek: 0,
    ownsTasks: [],
    ...overrides,
  };
}

const three: Contributor[] = [
  contributor({ id: 'c1', name: 'A' }),
  contributor({ id: 'c2', name: 'B' }),
  contributor({ id: 'c3', name: 'C' }),
];

describe('Given an amount that does not divide evenly', () => {
  it('When split three ways, Then the parts sum to exactly the total', () => {
    // $100.00 = 10000 cents across 3 -> 3333.33 each. Largest remainder gives
    // 3334 / 3333 / 3333, which sums to exactly 10000.
    const parts = distributeCents(10_000, [1, 1, 1]);
    expect(parts).toEqual([3_334, 3_333, 3_333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it('When many awkward totals are split, Then no cent is ever lost or invented', () => {
    for (let total = 0; total <= 500; total += 7) {
      for (let n = 1; n <= 6; n += 1) {
        const parts = distributeCents(total, new Array(n).fill(1));
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(parts).toHaveLength(n);
      }
    }
  });

  it('When weights are all zero, Then it still sums exactly rather than dividing by zero', () => {
    const parts = distributeCents(10_000, [0, 0, 0]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it('When there are no contributors, Then the result is empty rather than NaN', () => {
    expect(distributeCents(10_000, [])).toEqual([]);
  });
});

describe('Given an equal split among three siblings', () => {
  it('When computed, Then each share is equal and the total matches the shortfall', () => {
    const result = computeSplit({
      shortfallCents: 300_000,
      contributors: three,
      method: 'equal',
      aideHourlyRateCents: 3_500,
    });
    expect(result.shares.map((s) => s.monthlyCents)).toEqual([100_000, 100_000, 100_000]);
    expect(result.totalCents).toBe(300_000);
  });
});

describe('Given siblings who earn very different amounts', () => {
  it('When split by income, Then shares are proportional and still sum exactly', () => {
    const result = computeSplit({
      shortfallCents: 90_000,
      contributors: [
        contributor({ id: 'c1', name: 'A', annualIncomeCents: 6_000_000 }), // $60k
        contributor({ id: 'c2', name: 'B', annualIncomeCents: 3_000_000 }), // $30k
      ],
      method: 'income_proportional',
      aideHourlyRateCents: 3_500,
    });
    // 90000 * 60/90 = 60000 and 90000 * 30/90 = 30000.
    expect(result.shares.map((s) => s.monthlyCents)).toEqual([60_000, 30_000]);
    expect(result.totalCents).toBe(90_000);
    expect(result.fellBackToEqual).toBe(false);
  });

  it('When an income is missing, Then it falls back to equal and says so', () => {
    const result = computeSplit({
      shortfallCents: 90_000,
      contributors: [
        contributor({ id: 'c1', name: 'A', annualIncomeCents: 6_000_000 }),
        contributor({ id: 'c2', name: 'B' }),
      ],
      method: 'income_proportional',
      aideHourlyRateCents: 3_500,
    });
    // Falling back silently would misrepresent the basis of numbers a family is
    // about to argue over.
    expect(result.fellBackToEqual).toBe(true);
    expect(result.shares.map((s) => s.monthlyCents)).toEqual([45_000, 45_000]);
  });
});

describe('Given custom pledges that do not cover the gap', () => {
  it('When computed, Then the unfunded remainder is surfaced rather than hidden', () => {
    const result = computeSplit({
      shortfallCents: 100_000,
      contributors: [
        contributor({ id: 'c1', name: 'A', monthlyPledgeCents: 40_000 }),
        contributor({ id: 'c2', name: 'B', monthlyPledgeCents: 30_000 }),
      ],
      method: 'custom',
      aideHourlyRateCents: 3_500,
    });
    expect(result.totalCents).toBe(70_000);
    expect(result.unfundedCents).toBe(30_000);
  });
});

describe('Given a sibling who provides care instead of cash', () => {
  it('When shares are computed, Then unpaid hours are valued and shown, never netted off', () => {
    const result = computeSplit({
      shortfallCents: 200_000,
      contributors: [
        contributor({ id: 'c1', name: 'A', providesUnpaidHoursPerWeek: 20 }),
        contributor({ id: 'c2', name: 'B' }),
      ],
      method: 'equal',
      aideHourlyRateCents: 3_500,
    });
    // 20 hrs * $35 * 52/12 = 303,333 cents/mo of care contributed.
    expect(result.shares[0].unpaidHoursValueCents).toBe(303_333);
    // The cash share is unchanged: how to weigh time against money is a family
    // decision, not the app's.
    expect(result.shares[0].monthlyCents).toBe(100_000);
  });
});

describe('Given a contributor who has said what they can afford', () => {
  it('When their share exceeds it, Then the plan flags it rather than presenting it as settled', () => {
    const result = computeSplit({
      shortfallCents: 400_000,
      contributors: [
        contributor({ id: 'c1', name: 'A', monthlyCapacityCents: 50_000 }),
        contributor({ id: 'c2', name: 'B', monthlyCapacityCents: 500_000 }),
      ],
      method: 'equal',
      aideHourlyRateCents: 3_500,
    });
    expect(result.shares[0].exceedsCapacity).toBe(true);
    expect(result.shares[1].exceedsCapacity).toBe(false);
    expect(result.anyExceedsCapacity).toBe(true);
  });
});

describe('Given nobody has been added as a contributor yet', () => {
  it('When computed, Then the whole shortfall is reported as unfunded', () => {
    const result = computeSplit({
      shortfallCents: 200_000,
      contributors: [],
      method: 'equal',
      aideHourlyRateCents: 3_500,
    });
    expect(result.shares).toEqual([]);
    expect(result.unfundedCents).toBe(200_000);
  });
});
