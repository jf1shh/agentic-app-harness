/**
 * Reading "when does the money run out" off a projected series (spec §11.8).
 *
 * The IL comparison chart plots `assetsEndByMonthCents` month by month, and
 * until now carried only two x-axis labels — "Month 1" and "Month N" — so the
 * one thing a family most wants from it ("we run out somewhere around year
 * six") was not readable at all.
 *
 * Two rules hold this module together.
 *
 *  1. **Read, never recompute.** The depletion month is found by scanning the
 *     same series the chart draws. Deriving it independently from the plan's
 *     inputs would be a second implementation of the runway engine, which
 *     passes review the day it is written and drifts the first time the engine
 *     changes — and a marker sitting at the wrong month, on a curve the reader
 *     can see, is worse than no marker (§6 "Explain the Arithmetic Without
 *     Re-implementing It").
 *  2. **Do not round to the boundary.** §11.8 requires that a crossing shown
 *     near a year label actually happened in a month inside that year. Savings
 *     that run out in month 74 are reported as month 74 in year 7, never
 *     snapped to month 72 or 84, or the marker would contradict the curve
 *     directly beneath it.
 *
 * Months are 1-based in everything a reader sees, and 0-based where they index
 * the series. Both are returned so callers never have to do the conversion —
 * an off-by-one here would place the marker a month away from the crossing.
 */

/** Where a projected balance first reaches zero. */
export interface Depletion {
  /** 0-based index into the plotted series. */
  readonly monthIndex: number;
  /** 1-based month number, as shown to a reader. */
  readonly month: number;
  /** The year containing that month: months 1-12 are year 1. */
  readonly year: number;
  /** True when the month is the last of its year (12, 24, 36, ...). */
  readonly isOnYearBoundary: boolean;
}

/**
 * The first month at or below zero, or `null` when the balance never gets
 * there.
 *
 * `null` is the honest answer for a plan that survives its projection —
 * reporting a depletion month for it would invent an event that does not occur.
 */
export function findDepletion(series: readonly number[]): Depletion | null {
  const monthIndex = series.findIndex((cents) => cents <= 0);
  if (monthIndex === -1) return null;

  const month = monthIndex + 1;
  return {
    monthIndex,
    month,
    year: Math.ceil(month / 12),
    isOnYearBoundary: month % 12 === 0,
  };
}

/** A whole year's end, positioned on the chart's month axis. */
export interface YearBoundary {
  readonly year: number;
  /** 1-based month number of that year's last month. */
  readonly month: number;
  /** 0-based index into the plotted series. */
  readonly monthIndex: number;
}

/**
 * Every completed year inside a series of `totalMonths` months.
 *
 * A partial trailing year gets no boundary: a tick at month 36 on a 30-month
 * projection would sit off the end of the axis, labelling a year the chart
 * does not cover.
 */
export function yearBoundaries(totalMonths: number): YearBoundary[] {
  const boundaries: YearBoundary[] = [];
  for (let year = 1; year * 12 <= totalMonths; year += 1) {
    const month = year * 12;
    boundaries.push({ year, month, monthIndex: month - 1 });
  }
  return boundaries;
}
