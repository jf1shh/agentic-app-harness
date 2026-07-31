/**
 * Resolving the §11.10 break-even band from the cited rate data.
 *
 * This was previously inline in `BreakEvenSlider`, which had a consequence
 * worth recording: the panel's summary paragraph had no access to the band, so
 * it stated the crossover as a *single hour* while the slider directly beneath
 * it stated a *range*. Two renderings of the same fact, in the same card, in
 * contradictory shapes — and the one that was wrong (§1.1 forbids a point
 * estimate where a range is the honest answer) was the more prominent of the two.
 *
 * Lifting it here lets the panel resolve the band once and hand the same object
 * to every consumer. Resolving it separately in two components is the drift
 * this module exists to prevent: two call sites stay identical only until
 * someone edits one of them.
 *
 * There is deliberately no synthesised fallback. If the cited row ever lacks
 * the band fields, the band collapses to the plan's own rate — a zero-width
 * band the UI renders as a single-point anchor — rather than inventing a spread,
 * which §7 forbids.
 */

import { computeBreakEven, type BreakEvenInput } from './breakeven';
import { computeBreakEvenBand, type BreakEvenBand } from './breakevenBand';
import { NATIONAL_MEDIANS, type FigureConfidence } from '../data/costOfCare';

export interface CitedBreakEvenBand {
  readonly band: BreakEvenBand;
  /** Cited low bound in cents, absent when the row carries no band. */
  readonly lowRateCents?: number;
  /** Cited high bound in cents, absent when the row carries no band. */
  readonly highRateCents?: number;
  /** False when no cited band exists, so callers can say so rather than guess. */
  readonly hasCitedBand: boolean;
  /**
   * The band's own confidence, which is NOT the row's. The survey publishes a
   * single merged hourly rate, so the spread around it is `derived`.
   */
  readonly confidence?: FigureConfidence;
}

/**
 * Resolve the cited band and the break-even band it produces.
 *
 * The rate row is `in_home_health_aide` — the same row `aideHourlyRateCents`
 * resolves the plan's rate from, so the band and the cost line can never be
 * sourced from different care types.
 */
export function resolveCitedBreakEvenBand(input: BreakEvenInput): CitedBreakEvenBand {
  const row = NATIONAL_MEDIANS.find((e) => e.careType === 'in_home_health_aide');
  const lowRateCents = row?.lowHourlyCents;
  const highRateCents = row?.highHourlyCents;
  const hasCitedBand = typeof lowRateCents === 'number' && typeof highRateCents === 'number';

  const band = computeBreakEvenBand(input, {
    lowRateCents: hasCitedBand ? (lowRateCents as number) : input.hourlyRateCents,
    highRateCents: hasCitedBand ? (highRateCents as number) : input.hourlyRateCents,
  });

  return {
    band,
    lowRateCents,
    highRateCents,
    hasCitedBand,
    confidence: row?.hourlyBandConfidence,
  };
}

/**
 * Build the engine input the band is resolved from, given a `BreakEvenResult`.
 *
 * Kept here so the panel and the slider cannot assemble it differently — the
 * ancillary term in particular is a subtraction that is easy to get subtly
 * wrong in two places.
 */
export function breakEvenBandInputFrom(
  hourlyRateCents: number,
  hoursPerWeek: number,
  housingCarryMonthlyCents: number,
  inHomeFixedMonthlyCents: number,
  residentialMonthlyCents: number,
): BreakEvenInput {
  return {
    hourlyRateCents,
    currentHoursPerWeek: hoursPerWeek,
    housingCarryMonthlyCents,
    inHomeAncillaryMonthlyCents: Math.max(0, inHomeFixedMonthlyCents - housingCarryMonthlyCents),
    residentialAllInMonthlyCents: residentialMonthlyCents,
  };
}

/** Re-exported so callers needing the raw engine do not reach around this module. */
export { computeBreakEven };
