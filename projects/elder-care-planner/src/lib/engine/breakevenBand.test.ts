/**
 * Unit tests for the §11.10 Break-Even band helper.
 *
 * The Rev 12 banner locks `engine/breakeven.ts` against change. The band shape
 * (`lowHours`/`highHours`) is computed *at the UI layer* by the helper exercised
 * here — a pure function that calls the existing engine twice and returns the
 * two crossover hour counts as the band's edges.
 *
 * The structural assertion is the load-bearing one: the band's edges are
 * exactly the engine's outputs at the two rate bounds. Anything we compute
 * from there is the helper's responsibility.
 */
import { describe, it, expect } from 'vitest';
import { computeBreakEven, type BreakEvenInput } from './breakeven';
import { computeBreakEvenBand } from './breakevenBand';

function input(overrides: Partial<BreakEvenInput> = {}): BreakEvenInput {
  return {
    hourlyRateCents: 3500, // $35/hr national median
    currentHoursPerWeek: 40,
    housingCarryMonthlyCents: 0,
    inHomeAncillaryMonthlyCents: 0,
    residentialAllInMonthlyCents: 620_000, // $6,200/mo assisted living median
    ...overrides,
  };
}

describe('Given the published national medians, And a rate band from costOfCare.ts', () => {
  it('When computeBreakEvenBand is called, Then lowHours equals computeBreakEven(input, hourlyRate=lowRate).breakEvenHoursPerWeek', () => {
    // Structural assertion: the band's low edge is exactly the engine's output
    // when rate bound is set to lowRateCents. Same math, same number.
    const LOW_RATE = 3000;
    const band = computeBreakEvenBand(input(), { lowRateCents: LOW_RATE, highRateCents: 4000 });
    const expected = computeBreakEven({ ...input(), hourlyRateCents: LOW_RATE }).breakEvenHoursPerWeek;
    expect(band.lowHours).toBe(expected);
  });

  it('When computeBreakEvenBand is called, Then highHours equals computeBreakEven(input, hourlyRate=highRate).breakEvenHoursPerWeek', () => {
    const HIGH_RATE = 4000;
    const band = computeBreakEvenBand(input(), { lowRateCents: 3000, highRateCents: HIGH_RATE });
    const expected = computeBreakEven({ ...input(), hourlyRateCents: HIGH_RATE }).breakEvenHoursPerWeek;
    expect(band.highHours).toBe(expected);
  });

  it('When the band is computed, Then midpointHours is the arithmetic mean of the two edges', () => {
    const band = computeBreakEvenBand(input(), { lowRateCents: 3000, highRateCents: 4000 });
    expect(band.midpointHours).toBe((band.lowHours + band.highHours) / 2);
  });

  it('When the rate band is oriented low < high, Then lowHours > highHours (cheaper care needs more hours before it pays to switch)', () => {
    // Lower rate means more weeks of paid in-home help accumulate before the
    // total cost reaches the residential baseline — the crossover sits further
    // out on the hours axis. So at a lower rate we expect a larger crossover
    // week count.
    const band = computeBreakEvenBand(input(), { lowRateCents: 3000, highRateCents: 4000 });
    expect(band.lowHours).toBeGreaterThan(band.highHours);
    expect(band.isDegenerate).toBe(false);
  });

  it('When both rates are identical (band width is zero), Then both band edges equal each other and isDegenerate is false', () => {
    // Same rate on both bounds is logically a zero-width band, not a degenerate
    // one. The slider UI would draw a single point.
    const band = computeBreakEvenBand(input(), { lowRateCents: 3500, highRateCents: 3500 });
    expect(band.lowHours).toBe(band.highHours);
    expect(band.isDegenerate).toBe(false);
  });
});

describe('Given degenerate engine cases', () => {
  it('When hourly rate is zero and residential is more expensive than fixed, Then both engine calls return +Infinity and isDegenerate is true', () => {
    // Engine: costPerHourPerMonth (= 0 * 52/12) <= 0 and !residentialAlwaysCheaper
    // → Number.POSITIVE_INFINITY. (engine/breakeven.ts:64-68)
    const inp = input({ housingCarryMonthlyCents: 0, residentialAllInMonthlyCents: 620_000 });
    const band = computeBreakEvenBand(inp, { lowRateCents: 0, highRateCents: 0 });
    expect(band.lowHours).toBe(Number.POSITIVE_INFINITY);
    expect(band.highHours).toBe(Number.POSITIVE_INFINITY);
    expect(band.isDegenerate).toBe(true);
  });

  it('When residential is already cheaper than in-home fixed costs, Then both engine calls return 0 (band collapses to the lower axis edge)', () => {
    // housingCarry > residentialAllIn makes residentialAlwaysCheaper true at
    // every rate. Engine returns 0 for both. 0 is finite, so isDegenerate is
    // false — but the band is a zero-width at 0, which the UI renders as a
    // single-point anchor at the lower edge.
    const inp = input({
      housingCarryMonthlyCents: 1_000_000,
      inHomeAncillaryMonthlyCents: 0,
      residentialAllInMonthlyCents: 620_000,
      hourlyRateCents: 3500,
    });
    const band = computeBreakEvenBand(inp, { lowRateCents: 3000, highRateCents: 4000 });
    expect(band.lowHours).toBe(0);
    expect(band.highHours).toBe(0);
    expect(band.isDegenerate).toBe(false);
  });
});
