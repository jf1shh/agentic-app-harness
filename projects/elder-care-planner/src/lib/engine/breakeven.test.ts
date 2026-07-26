/**
 * Unit tests for the Break-Even Analyzer.
 *
 * Golden values hand-computed from the published national medians, arithmetic
 * shown in the comments (spec §8).
 */
import { describe, it, expect } from 'vitest';
import { computeBreakEven, monthlyCostOfHours, type BreakEvenInput } from './breakeven';

function input(overrides: Partial<BreakEvenInput> = {}): BreakEvenInput {
  return {
    hourlyRateCents: 3_500, // $35/hr national median
    currentHoursPerWeek: 40,
    housingCarryMonthlyCents: 0,
    inHomeAncillaryMonthlyCents: 0,
    residentialAllInMonthlyCents: 620_000, // $6,200/mo assisted living median
    ...overrides,
  };
}

describe('Given the published national medians and no housing costs counted', () => {
  it('When the crossover is solved, Then it lands in the researched 40–44 hrs/week band', () => {
    // 620000 * 12 / (3500 * 52) = 7,440,000 / 182,000 = 40.8791...
    const result = computeBreakEven(input());
    expect(result.breakEvenHoursPerWeek).toBeCloseTo(40.8791, 3);
    expect(result.breakEvenHoursPerWeek).toBeGreaterThanOrEqual(40);
    expect(result.breakEvenHoursPerWeek).toBeLessThanOrEqual(44);
  });

  it('When 40 hours are bought, Then in-home is still the cheaper option', () => {
    const result = computeBreakEven(input({ currentHoursPerWeek: 40 }));
    // 3500 * 40 * 52/12 = 606,667/mo vs 620,000/mo residential.
    expect(result.inHomeMonthlyCents).toBe(606_667);
    expect(result.cheaperOption).toBe('in_home');
    expect(result.monthlyDifferenceCents).toBe(13_333);
  });

  it('When hours rise past the crossover, Then the recommendation flips', () => {
    expect(computeBreakEven(input({ currentHoursPerWeek: 45 })).cheaperOption).toBe(
      'residential',
    );
  });
});

describe('Given the real cost of staying at home is counted', () => {
  it('When $2,000/mo of housing carry is included, Then the crossover drops sharply', () => {
    // (620000 - 200000) * 12 / (3500 * 52) = 5,040,000 / 182,000 = 27.6923...
    const result = computeBreakEven(input({ housingCarryMonthlyCents: 200_000 }));
    expect(result.breakEvenHoursPerWeek).toBeCloseTo(27.6923, 3);
    // The comparison most published guides make — caregiver hours only — would
    // have said in-home was cheaper here. Fully loaded, it is not.
    expect(result.cheaperOption).toBe('residential');
  });

  it('When fixed costs alone exceed the facility, Then the crossover is zero, not negative', () => {
    const result = computeBreakEven(input({ housingCarryMonthlyCents: 700_000 }));
    expect(result.breakEvenHoursPerWeek).toBe(0);
    expect(result.residentialAlwaysCheaper).toBe(true);
  });
});

describe('Given round-the-clock care at home', () => {
  it('When 168 hours a week are priced, Then residential is far cheaper', () => {
    const result = computeBreakEven(input({ currentHoursPerWeek: 168 }));
    // 3500 * 168 * 52/12 = 2,548,000/mo — over four times the facility rate.
    expect(result.inHomeMonthlyCents).toBe(2_548_000);
    expect(result.cheaperOption).toBe('residential');
  });
});

describe('Given a state where hourly rates are higher', () => {
  it('When the rate rises, Then the crossover falls', () => {
    const cheap = computeBreakEven(input({ hourlyRateCents: 3_000 }));
    const dear = computeBreakEven(input({ hourlyRateCents: 4_500 }));
    expect(dear.breakEvenHoursPerWeek).toBeLessThan(cheap.breakEvenHoursPerWeek);
    // 620000 * 12 / (4500 * 52) = 7,440,000 / 234,000 = 31.7949...
    expect(dear.breakEvenHoursPerWeek).toBeCloseTo(31.7949, 3);
  });
});

describe('Given care provided free by family', () => {
  it('When the hourly rate is zero, Then no crossover exists rather than dividing by zero', () => {
    const result = computeBreakEven(input({ hourlyRateCents: 0 }));
    expect(result.breakEvenHoursPerWeek).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(result.breakEvenHoursPerWeek)).toBe(false);
  });
});

describe('Given an hourly rate and a weekly hour count', () => {
  it('When converted, Then a month is 52 weeks over 12, not four weeks', () => {
    // 3500 * 10 * 52 / 12 = 151,667 (four-week months would give 140,000)
    expect(monthlyCostOfHours(3_500, 10)).toBe(151_667);
  });
});
