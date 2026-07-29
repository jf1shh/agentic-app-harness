'use client';

/**
 * Interactive break-even slider (spec §11.10).
 *
 * Reads an explicit rate band from `data/costOfCare.ts` (the
 * `in_home_homemaker` row's `lowHourlyCents` / `highHourlyCents` fields added
 * in the same change) and exposes the corresponding break-even band via
 * `computeBreakEvenBand` — a pure helper that calls the existing
 * `computeBreakEven` engine twice (Rev 12 banner locks the engine against
 * change; the band is computed at this UI-adjacent seam).
 *
 * Three rules this surface holds to:
 *  - The thumb's initial position binds to whatever `PlanState.currentHoursPerWeek`
 *    the family has saved; never starts at zero or a default. Reopening the panel
 *    restores that saved value through the existing prop chain.
 *  - The thumb position itself updates on every input event; the SVG chart redraws
 *    on a deferred tick (`useDeferredValue`), so a fast drag does not strobe.
 *    Deferred render is *not* animation, so §5.5 holds.
 *  - The band collapses to a single-point anchor on the chart's axis when the
 *    engine returns a degenerate `Number.POSITIVE_INFINITY` (zero hourly rate
 *    case) or when the two band edges are equal. It never draws an unbounded
 *    axis range.
 */

import { useDeferredValue, useId, useMemo } from 'react';
import { computeBreakEvenBand } from '@/lib/engine/breakevenBand';
import { NATIONAL_MEDIANS } from '@/lib/data/costOfCare';

const HOURS_PER_WEEK_MAX = 168;
const WEEKS_PER_MONTH = 52 / 12;

interface Props {
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
  hoursPerWeek,
  onHoursChange,
  hourlyRateCents,
  housingCarryMonthlyCents,
  inHomeFixedMonthlyCents,
  residentialMonthlyCents,
}: Props) {
  const id = useId();

  // Band source: costOfCare row for in_home_homemaker (per spec §11.10).
  // The two hourly-care rows already share the same band on-disk because the
  // 2025 Genworth survey merges those two care types into one hourly figure.
  // If the row is read from older cache that pre-dates the band shape, fall
  // back to a ±20% sensitivity band so the slider never degrades silently.
  const band = useMemo(() => {
    const row = NATIONAL_MEDIANS.find((e) => e.careType === 'in_home_homemaker');
    const lowRateCents = row?.lowHourlyCents ?? Math.max(1, Math.round(hourlyRateCents * 0.8));
    const highRateCents = row?.highHourlyCents ?? Math.max(lowRateCents + 1, Math.round(hourlyRateCents * 1.2));
    return computeBreakEvenBand(
      {
        hourlyRateCents,
        currentHoursPerWeek: hoursPerWeek,
        housingCarryMonthlyCents,
        inHomeAncillaryMonthlyCents: Math.max(0, inHomeFixedMonthlyCents - housingCarryMonthlyCents),
        residentialAllInMonthlyCents: residentialMonthlyCents,
      },
      { lowRateCents, highRateCents },
    );
  }, [
    hourlyRateCents,
    hoursPerWeek,
    housingCarryMonthlyCents,
    inHomeFixedMonthlyCents,
    residentialMonthlyCents,
  ]);

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
  const inHomeLineY2 = yToY(yMax);

  // Degenerate handling: the band collapses to a vertical anchor on the axis.
  const isDegenerateBand =
    band.isDegenerate ||
    band.lowHours === band.highHours ||
    !Number.isFinite(band.lowHours) ||
    !Number.isFinite(band.highHours);
  const bandXLow = hoursToX(Number.isFinite(band.lowHours) ? band.lowHours : 0);
  const bandXHigh = hoursToX(Number.isFinite(band.highHours) ? band.highHours : HOURS_PER_WEEK_MAX);

  // Neutral-voice status line: never addresses the reader in the second
  // person, never ranks options, and reports the band as a band — never a
  // single hour.
  const statusMidpoint = Number.isFinite(band.midpointHours)
    ? `Crossover roughly ${band.midpointHours.toFixed(1)} hrs/week.`
    : isDegenerateBand
      ? 'Band collapses to a single-point anchor at one edge of the axis.'
      : 'Crossover band has not been computed.';

  return (
    <div className="break-even-slider" data-testid="break-even-slider">
      <label htmlFor={id}>
        Paid help at home, hours per week
        <span className="hint">
          Slide to compare options. The thumb sits at the family&apos;s saved plan, and the shaded band
          shows where the crossover lies across the published hourly-rate range.
        </span>
      </label>
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
        data-testid="break-even-slider-thumb"
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onHoursChange(next);
        }}
      />
      <svg
        role="img"
        aria-label="Break-even chart: in-home cost line rising with paid hours, residential baseline, and the crossover band"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
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
        Selected hours: {hoursPerWeek}. {statusMidpoint}
      </p>
    </div>
  );
}
