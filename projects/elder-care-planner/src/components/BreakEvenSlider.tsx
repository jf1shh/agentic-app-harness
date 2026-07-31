'use client';

/**
 * Interactive break-even slider (spec §11.10).
 *
 * Reads an explicit rate band from `data/costOfCare.ts` (the
 * `in_home_health_aide` row's `lowHourlyCents` / `highHourlyCents` fields —
 * the same row `aideHourlyRateCents` resolves the thumb's rate from, so the
 * band and the cost line can never be sourced from different care types) and
 * exposes the corresponding break-even band via `computeBreakEvenBand` — a
 * pure helper that calls the existing `computeBreakEven` engine twice (Rev 12
 * banner locks the engine against change; the band is computed at this
 * UI-adjacent seam).
 *
 * Four rules this surface holds to:
 *  - The thumb's initial position binds to whatever comparison hours the family
 *    has saved (`PlannerState.compareHoursPerWeek`, passed in as `hoursPerWeek`;
 *    it becomes `BreakEvenInput.currentHoursPerWeek` at the engine boundary).
 *    It never starts at zero or a default.
 *  - The thumb position itself updates on every input event; the SVG chart redraws
 *    on a deferred tick (`useDeferredValue`), so a fast drag does not strobe.
 *    Deferred render is *not* animation, so §5.5 holds.
 *  - The band collapses to a single-point anchor on the chart's axis when the
 *    engine returns a degenerate `Number.POSITIVE_INFINITY` (zero hourly rate
 *    case) or when the two band edges are equal. It never draws an unbounded
 *    axis range.
 *  - The status line reports the crossover as a *band*, never as a single hour
 *    (§11.10, §1.1, §5.3). The midpoint is available but is never the only
 *    figure shown, and the band's `derived` confidence is surfaced beside it
 *    per the §6 "Cite Confidence, Not Just Sources" rule.
 */

import { useDeferredValue, useId, useMemo } from 'react';
import { computeBreakEvenBand } from '@/lib/engine/breakevenBand';
import { NATIONAL_MEDIANS } from '@/lib/data/costOfCare';
import { DOLLAR_BASIS_LABEL } from '@/lib/dollarBasis';
import { buildBreakEvenHeadline } from '@/lib/breakEvenHeadline';
import type { BreakEvenResult } from '@/lib/engine/breakeven';

const HOURS_PER_WEEK_MAX = 168;
const WEEKS_PER_MONTH = 52 / 12;

interface Props {
  /**
   * The engine's result at the CURRENT slider position. `page.tsx` recomputes
   * it from the same state the slider writes, so the headline built from it
   * tracks the drag rather than the saved default (spec §11.11).
   */
  result: BreakEvenResult;
  hoursPerWeek: number;
  onHoursChange: (n: number) => void;
  hourlyRateCents: number;
  housingCarryMonthlyCents: number;
  /** `BreakEvenResult.inHomeFixedMonthlyCents` — fixed in-home costs before any paid hour. */
  inHomeFixedMonthlyCents: number;
  /** `BreakEvenResult.residentialMonthlyCents` — the all-in residential baseline. */
  residentialMonthlyCents: number;
}

export function BreakEvenSlider({
  result,
  hoursPerWeek,
  onHoursChange,
  hourlyRateCents,
  housingCarryMonthlyCents,
  inHomeFixedMonthlyCents,
  residentialMonthlyCents,
}: Props) {
  const id = useId();

  // Band source: the costOfCare row for in_home_health_aide (spec §11.10) —
  // the same row `aideHourlyRateCents` resolves the rate from. Both hourly
  // rows carry an identical band because the 2025 Genworth survey merges the
  // two care types into one published hourly figure.
  //
  // There is deliberately NO synthesised fallback here. An earlier version
  // fell back to a +/-20% spread when the fields were absent, which (a) could
  // never run, because NATIONAL_MEDIANS is a compile-time constant that always
  // carries them, and (b) would have invented a rate range on screen, which §7
  // forbids. If the band is ever genuinely absent the slider degenerates to a
  // single-point anchor at the plan's own rate and says so, rather than
  // fabricating a spread.
  const bandRow = NATIONAL_MEDIANS.find((e) => e.careType === 'in_home_health_aide');
  const lowRateCents = bandRow?.lowHourlyCents;
  const highRateCents = bandRow?.highHourlyCents;
  const hasCitedBand =
    typeof lowRateCents === 'number' && typeof highRateCents === 'number';
  const bandConfidence = bandRow?.hourlyBandConfidence;

  const band = useMemo(() => {
    return computeBreakEvenBand(
      {
        hourlyRateCents,
        currentHoursPerWeek: hoursPerWeek,
        housingCarryMonthlyCents,
        inHomeAncillaryMonthlyCents: Math.max(0, inHomeFixedMonthlyCents - housingCarryMonthlyCents),
        residentialAllInMonthlyCents: residentialMonthlyCents,
      },
      {
        lowRateCents: hasCitedBand ? (lowRateCents as number) : hourlyRateCents,
        highRateCents: hasCitedBand ? (highRateCents as number) : hourlyRateCents,
      },
    );
  }, [
    hourlyRateCents,
    hoursPerWeek,
    housingCarryMonthlyCents,
    inHomeFixedMonthlyCents,
    residentialMonthlyCents,
    hasCitedBand,
    lowRateCents,
    highRateCents,
  ]);

  // Spec §11.11. Built from engine output and the band above, never recomputed
  // here, so the sentence and the chart cannot disagree.
  const headline = buildBreakEvenHeadline(result, band, hoursPerWeek);

  // SVG redraw deferred; thumb position updates on every input (spec §11.10).
  const deferredHours = useDeferredValue(hoursPerWeek);

  // Two lines on the chart: the in-home cost line (rising in hours) and the
  // residential baseline (horizontal). The band sits where these two lines
  // intersect — a low–high rectangle along the x-axis.
  const width = 320;
  const height = 80;
  const pad = 8;
  const innerWidth = width - pad * 2;
  const innerHeight = height - pad * 2;
  const hoursToX = (h: number) =>
    pad + (Math.min(HOURS_PER_WEEK_MAX, Math.max(0, h)) / HOURS_PER_WEEK_MAX) * innerWidth;

  const inHomeYAt = (hours: number) =>
    housingCarryMonthlyCents +
    Math.max(0, inHomeFixedMonthlyCents - housingCarryMonthlyCents) +
    Math.round(hourlyRateCents * hours * WEEKS_PER_MONTH);
  const inHomeMonthlyNow = inHomeYAt(deferredHours);

  // Y-axis is cents, the larger of the two trajectories wins the scale.
  const yMax = Math.max(inHomeYAt(HOURS_PER_WEEK_MAX), residentialMonthlyCents, 1);
  const yToY = (cents: number) => pad + innerHeight - (cents / yMax) * innerHeight;
  const residentialY = yToY(residentialMonthlyCents);

  const inHomeLineX1 = hoursToX(0);
  const inHomeLineY1 = yToY(inHomeYAt(0));
  const inHomeLineX2 = hoursToX(HOURS_PER_WEEK_MAX);
  // The in-home line must terminate at its OWN value at the axis maximum, not
  // at the chart's y-scale maximum. Those coincide only while the in-home cost
  // at 168 hrs/week is the tallest thing on the chart. When the residential
  // baseline is higher (a low hourly rate, or the zero-rate degenerate case),
  // `yToY(yMax)` pinned this endpoint to the top of the chart and drew the
  // in-home line crossing a baseline it never actually reaches — a crossover
  // the family does not have.
  const inHomeLineY2 = yToY(inHomeYAt(HOURS_PER_WEEK_MAX));

  // Degenerate handling: the band collapses to a vertical anchor on the axis.
  const isDegenerateBand =
    band.isDegenerate ||
    band.lowHours === band.highHours ||
    !Number.isFinite(band.lowHours) ||
    !Number.isFinite(band.highHours);
  const bandXLow = hoursToX(Number.isFinite(band.lowHours) ? band.lowHours : 0);
  const bandXHigh = hoursToX(Number.isFinite(band.highHours) ? band.highHours : HOURS_PER_WEEK_MAX);

  // Neutral-voice status line: never addresses the reader in the second
  // person, never ranks options, and reports the crossover as a BAND — never
  // as a single hour (§11.10, §1.1, §5.3). The midpoint is available but is
  // never the only figure shown, which is why it trails the range rather than
  // replacing it.
  const bandLowEdge = Math.min(band.lowHours, band.highHours);
  const bandHighEdge = Math.max(band.lowHours, band.highHours);
  const statusBand =
    !isDegenerateBand && Number.isFinite(bandLowEdge) && Number.isFinite(bandHighEdge)
      ? `Crossover band: roughly ${bandLowEdge.toFixed(1)}–${bandHighEdge.toFixed(1)} hrs/week`
        + `${Number.isFinite(band.midpointHours) ? ` (midpoint ${band.midpointHours.toFixed(1)})` : ''}.`
      : 'Crossover band collapses to a single-point anchor at one edge of the axis.';

  // §6 "Cite Confidence, Not Just Sources": the band is a computed spread
  // around one published figure, so the tag travels with it on screen.
  const bandProvenance = hasCitedBand
    ? `Rate range $${((lowRateCents as number) / 100).toFixed(0)}–$${((highRateCents as number) / 100).toFixed(0)}/hr`
      + `${bandConfidence ? ` (${bandConfidence}` : ''}`
      + `${bandConfidence ? ', a symmetric spread around the one published $35/hr rate, not a surveyed range).' : '.'}`
    : 'No cited rate range is available, so the crossover is shown at the plan’s own rate only.';

  return (
    <div className="break-even-slider" data-testid="break-even-slider">
      {/* Spec §11.11: the NYT-calculator headline. Sits above the control it
          describes, and is rebuilt from engine output on every slider change
          so it can never disagree with the chart below it. */}
      <p className="headline" data-testid="break-even-headline">
        {headline}
      </p>
      <p className="hint" data-testid="slider-description">
        Slide to compare options. The thumb sits at the family&apos;s saved plan, and the shaded
        band shows where the crossover lies across a range of hourly rates.
      </p>
      <input
        id={id}
        type="range"
        min={0}
        max={HOURS_PER_WEEK_MAX}
        step={0.5}
        value={hoursPerWeek}
        aria-valuemin={0}
        aria-valuemax={HOURS_PER_WEEK_MAX}
        aria-valuenow={hoursPerWeek}
        aria-valuetext={`${hoursPerWeek} hours per week`}
        aria-label="Drag to choose hours of paid help at home"
        data-testid="break-even-slider-thumb"
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onHoursChange(next);
        }}
      />
      <svg
        role="img"
        aria-label="Break-even chart: in-home cost line rising with paid hours, residential baseline, and the crossover band"
        style={{ width: '100%', height: 'auto' }}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        data-testid={isDegenerateBand ? 'break-even-chart-degenerate' : 'break-even-chart'}
      >
        <line
          x1={pad}
          y1={residentialY}
          x2={width - pad}
          y2={residentialY}
          stroke="#9a3412"
          strokeWidth={2}
          strokeDasharray="4 4"
          data-testid="residential-baseline"
        />
        <line
          x1={inHomeLineX1}
          y1={inHomeLineY1}
          x2={inHomeLineX2}
          y2={inHomeLineY2}
          stroke="#1e5f4f"
          strokeWidth={2}
          data-testid="in-home-line"
        />
        {isDegenerateBand ? (
          // Single-point anchor: a 2-px tick spanning the chart's full height.
          <line
            x1={bandXLow}
            y1={pad}
            x2={bandXLow}
            y2={height - pad}
            stroke="#1e5f4f"
            strokeWidth={3}
            opacity={0.6}
            data-testid="band-anchor"
          />
        ) : (
          <rect
            x={Math.min(bandXLow, bandXHigh)}
            y={pad}
            width={Math.max(0, Math.abs(bandXHigh - bandXLow))}
            height={innerHeight}
            fill="#1e5f4f"
            opacity={0.14}
            data-testid="band-rect"
          />
        )}
        <circle
          cx={hoursToX(hoursPerWeek)}
          cy={Math.min(residentialY, yToY(inHomeMonthlyNow))}
          r={4}
          fill="#111827"
          data-testid="slider-thumb-on-chart"
        />
      </svg>
      <p className="hint section-status" data-testid="slider-status">
        Selected hours: {hoursPerWeek}. {statusBand}
      </p>
      <p className="hint" data-testid="slider-band-provenance">
        {bandProvenance}
      </p>
      {/* Spec §11.9: unlike the runway and IL charts, this comparison has no
          time dimension — `engine/breakeven.ts` prices one month at current
          rates. Saying so here is what stops a reader carrying the runway's
          inflated basis across to this panel. */}
      <p className="hint" data-testid="break-even-dollar-basis">
        {DOLLAR_BASIS_LABEL.today}
      </p>
    </div>
  );
}
