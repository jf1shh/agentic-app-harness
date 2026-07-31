/**
 * Unit tests for the cited break-even band resolver (spec §11.10 / §11.11).
 *
 * The band was previously resolved inside `BreakEvenSlider`, which meant the
 * panel's summary paragraph could not state it — and so the panel stated the
 * crossover as a single hour while the slider beside it stated a range. Two
 * renderings of the same fact, in the same card, in different shapes.
 *
 * Lifting the resolution here lets the panel resolve it ONCE and hand the same
 * object to every consumer. Resolving it twice from "the same" inputs is the
 * drift this module exists to make impossible: the two call sites only stay
 * identical until someone edits one.
 */
import { describe, it, expect } from 'vitest';
import { resolveCitedBreakEvenBand } from './citedBreakEvenBand';
import { computeBreakEven, type BreakEvenInput } from './breakeven';
import { NATIONAL_MEDIANS } from '../data/costOfCare';

function input(overrides: Partial<BreakEvenInput> = {}): BreakEvenInput {
  return {
    hourlyRateCents: 3500,
    currentHoursPerWeek: 40,
    housingCarryMonthlyCents: 250_000,
    inHomeAncillaryMonthlyCents: 0,
    residentialAllInMonthlyCents: 620_000,
    ...overrides,
  };
}

describe('Given the cited hourly-rate band in costOfCare.ts', () => {
  it('When the band is resolved, Then its bounds are the cited row’s, not a synthesised spread', () => {
    const row = NATIONAL_MEDIANS.find((e) => e.careType === 'in_home_health_aide');
    const cited = resolveCitedBreakEvenBand(input());

    expect(cited.hasCitedBand).toBe(true);
    expect(cited.lowRateCents).toBe(row?.lowHourlyCents);
    expect(cited.highRateCents).toBe(row?.highHourlyCents);
  });

  it('When the band is resolved, Then it carries the row’s band confidence rather than the row’s own tag', () => {
    // The row median is 'verified'; the derived spread around it is not.
    const cited = resolveCitedBreakEvenBand(input());
    expect(cited.confidence).toBe('derived');
  });

  it('When the band is resolved, Then its edges are the engine’s output at the two rate bounds', () => {
    const inp = input();
    const cited = resolveCitedBreakEvenBand(inp);

    const atLow = computeBreakEven({
      ...inp,
      hourlyRateCents: cited.lowRateCents as number,
    }).breakEvenHoursPerWeek;
    const atHigh = computeBreakEven({
      ...inp,
      hourlyRateCents: cited.highRateCents as number,
    }).breakEvenHoursPerWeek;

    expect(cited.band.lowHours).toBe(atLow);
    expect(cited.band.highHours).toBe(atHigh);
  });

  it('When the same inputs are resolved twice, Then both results agree, so two consumers cannot disagree', () => {
    // The property the panel relies on when it hands one object to two places.
    const a = resolveCitedBreakEvenBand(input());
    const b = resolveCitedBreakEvenBand(input());
    expect(a.band).toEqual(b.band);
    expect(a.lowRateCents).toBe(b.lowRateCents);
    expect(a.highRateCents).toBe(b.highRateCents);
  });

  it('When residential is already cheaper, Then the band collapses to zero rather than reporting a negative crossing', () => {
    const cited = resolveCitedBreakEvenBand(input({ housingCarryMonthlyCents: 1_000_000 }));
    expect(cited.band.lowHours).toBe(0);
    expect(cited.band.highHours).toBe(0);
  });
});
