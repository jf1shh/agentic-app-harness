/**
 * Unit tests for the sensitivity ranking.
 *
 * The properties that matter are determinism (a ranking that reshuffles between
 * renders is worthless advice) and defined behaviour when a plan never depletes,
 * where a naive implementation returns NaN.
 */
import { describe, it, expect } from 'vitest';
import { computeSensitivity } from './sensitivity';
import type { RunwayInput, RunwayAsset } from './runway';
import type { IncomeSource } from '../schemas';

const asset: RunwayAsset = {
  id: 'a1',
  label: 'Savings',
  kind: 'cash',
  balanceCents: 30_000_000, // $300,000
  annualReturnRate: 0.04,
  liquid: true,
};

const income: IncomeSource = {
  id: 'i1',
  label: 'Social Security',
  kind: 'social_security',
  monthlyCents: 250_000,
  colaRate: 0.02,
  eliminationPeriodDays: 0,
};

function input(overrides: Partial<RunwayInput> = {}): RunwayInput {
  return {
    allInMonthlyCents: 620_000,
    oneTimeCents: 400_000,
    annualEscalatorRate: 0.04,
    ancillaryMonthlyCents: 30_000,
    generalInflationRate: 0.03,
    income: [income],
    assets: [asset],
    projectionYears: 10,
    ...overrides,
  };
}

describe('Given a plan whose savings do run out', () => {
  it('When sensitivity is computed, Then every lever is reported, none dropped', () => {
    const result = computeSensitivity(input());
    expect(result.levers).toHaveLength(5);
  });

  it('When ranked, Then levers are ordered by impact, largest first', () => {
    const impacts = computeSensitivity(input()).levers.map((l) => l.impactMonths);
    const sorted = [...impacts].sort((a, b) => b - a);
    expect(impacts).toEqual(sorted);
  });

  it('When computed twice, Then the ranking is identical', () => {
    const first = computeSensitivity(input()).levers.map((l) => l.id);
    const second = computeSensitivity(input()).levers.map((l) => l.id);
    expect(first).toEqual(second);
  });

  it('When a top driver exists, Then it is named so the recommendation can cite it', () => {
    const result = computeSensitivity(input());
    expect(result.topLever).not.toBeNull();
    expect(result.topLever?.impactMonths).toBeGreaterThan(0);
  });

  it('When the band is reported, Then the low bound is no later than the high bound', () => {
    const result = computeSensitivity(input());
    expect(result.bandLowMonths).not.toBeNull();
    expect(result.bandHighMonths).not.toBeNull();
    expect(result.bandLowMonths as number).toBeLessThanOrEqual(result.bandHighMonths as number);
  });
});

describe('Given income that comfortably covers the cost of care', () => {
  it('When the money never runs out, Then the band is null rather than NaN or zero', () => {
    const result = computeSensitivity(
      input({
        allInMonthlyCents: 100_000,
        oneTimeCents: 0,
        ancillaryMonthlyCents: 0,
        income: [{ ...income, monthlyCents: 900_000 }],
      }),
    );
    expect(result.baseline.depletionMonth).toBeNull();
    expect(result.bandLowMonths).toBeNull();
    expect(result.bandHighMonths).toBeNull();
    expect(result.levers.every((l) => Number.isFinite(l.impactMonths))).toBe(true);
  });
});

describe('Given a lever that cannot affect this particular plan', () => {
  it('When there is no income, Then the COLA lever ranks last but is still listed', () => {
    const result = computeSensitivity(input({ income: [] }));
    const cola = result.levers.find((l) => l.id === 'income_cola');
    expect(cola).toBeDefined();
    expect(cola?.impactMonths).toBe(0);
    expect(result.levers[result.levers.length - 1].impactMonths).toBe(0);
  });
});

describe('Given the bands used to perturb each lever', () => {
  it('When reported, Then each lever declares whether it rests on data or an assumption', () => {
    const result = computeSensitivity(input());
    const escalator = result.levers.find((l) => l.id === 'annual_escalator');
    const returns = result.levers.find((l) => l.id === 'asset_return');
    // The 3–5% escalator band is published guidance; investment return is not.
    expect(escalator?.basis).toBe('published_range');
    expect(returns?.basis).toBe('planning_assumption');
  });
});
