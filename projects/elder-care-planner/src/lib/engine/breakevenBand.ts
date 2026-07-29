/**
 * Break-Even band helper (spec §11.10).
 *
 * The Break-Even Analyzer (§6.2) returns a single crossover hour count for a
 * fixed hourly rate. The interactive slider exposes a *band* on the same axis
 * by calling `computeBreakEven` twice — once at the low hourly-rate bound and
 * once at the high — and reading the two crossover hours as the band's edges.
 *
 * The pure engine stays untouched (Rev 12 banner: do not change
 * `engine/breakeven.ts` without a §9.2 walk of its ten current references); the
 * band is computed here, in a separate additive module, so the engine's
 * contract is not widened and the §9.2 walk is not on this PR's plate.
 */

import { computeBreakEven, type BreakEvenInput } from './breakeven';

export interface BreakEvenBand {
  /** Crossover hours/week computed at the LOW hourly-rate bound. */
  readonly lowHours: number;
  /** Crossover hours/week computed at the HIGH hourly-rate bound. */
  readonly highHours: number;
  /** Arithmetic mean of the two finite edges. */
  readonly midpointHours: number;
  /**
   * True when at least one edge is non-finite (a +Infinity engine output, the
   * call `computeBreakEven(...) → +Infinity` makes when `costPerHourPerMonth <= 0`
   * and residential is not already cheaper than fixed costs — see
   * `engine/breakeven.ts:62-72`). The slider UI is expected to collapse the
   * band to a single-point anchor at the lower or upper axis edge in this
   * case, never render an unbounded axis range.
   */
  readonly isDegenerate: boolean;
}

export interface BreakEvenBandInput {
  /** Hourly-rate band low (cents). Pulled from `data/costOfCare.ts`. */
  readonly lowRateCents: number;
  /** Hourly-rate band high (cents). Pulled from `data/costOfCare.ts`. */
  readonly highRateCents: number;
}

/**
 * Compute the §11.10 break-even band.
 *
 * Pure: no React, no storage, no ambient `Date.now()`. Calls the existing
 * engine twice with the same `input` and the two rate bounds, and returns the
 * two crossover hour counts as the band's edges plus a midpoint and a flag
 * that the slider UI uses to decide between a band rectangle and a single-point
 * anchor.
 */
export function computeBreakEvenBand(
  input: BreakEvenInput,
  opts: BreakEvenBandInput,
): BreakEvenBand {
  const lowRateResult = computeBreakEven({
    ...input,
    hourlyRateCents: opts.lowRateCents,
  });
  const highRateResult = computeBreakEven({
    ...input,
    hourlyRateCents: opts.highRateCents,
  });
  const lowHours = lowRateResult.breakEvenHoursPerWeek;
  const highHours = highRateResult.breakEvenHoursPerWeek;
  return {
    lowHours,
    highHours,
    midpointHours: (lowHours + highHours) / 2,
    isDegenerate: !Number.isFinite(lowHours) || !Number.isFinite(highHours),
  };
}
