/**
 * Unit tests for the depletion reader (spec §11.8).
 *
 * The chart plots `assetsEndByMonthCents` month by month. "When does the money
 * run out" must be READ from that same series rather than recomputed from the
 * inputs — a second implementation passes review on the day it is written and
 * drifts the first time the runway engine changes, and a marker sitting at the
 * wrong month on a curve the reader can see is worse than no marker at all
 * (§6 "Explain the Arithmetic Without Re-implementing It").
 *
 * The truthfulness rule from §11.8 is the load-bearing one: the depletion month
 * is reported at the month it actually happens. Rounding it to a year boundary
 * would make the marker disagree with the curve directly beneath it.
 */
import { describe, it, expect } from 'vitest';
import { findDepletion, yearBoundaries } from './depletion';

describe('Given a per-month savings series', () => {
  it('When savings reach zero mid-series, Then the depletion month is the first month at or below zero', () => {
    // Months are 1-based for a reader; index 3 is month 4.
    const series = [500, 300, 100, 0, 0];
    const depletion = findDepletion(series);
    expect(depletion).not.toBeNull();
    expect(depletion?.monthIndex).toBe(3);
    expect(depletion?.month).toBe(4);
  });

  it('When savings go negative without passing through zero, Then the first negative month is reported', () => {
    const series = [500, 200, -50, -300];
    expect(findDepletion(series)?.month).toBe(3);
  });

  it('When savings never reach zero, Then no depletion is reported rather than a guessed one', () => {
    // A plan that survives the projection must not be labelled with a
    // depletion month; inventing one is the §7 failure.
    expect(findDepletion([900, 800, 700])).toBeNull();
  });

  it('When the series is empty, Then no depletion is reported', () => {
    expect(findDepletion([])).toBeNull();
  });

  it('When savings start at zero, Then month 1 is reported rather than skipped', () => {
    expect(findDepletion([0, 0])?.month).toBe(1);
  });

  it('When depletion falls inside a year rather than on its boundary, Then the exact month is kept and the year is the one containing it', () => {
    // §11.8: "a year label landing on a non-zero crossing means the curve
    // actually crossed there in a month inside the year". Month 74 is in
    // year 7 (months 73-84), and must not be rounded to 72 or 84.
    const series = Array.from({ length: 120 }, (_, i) => (i < 73 ? 1000 : 0));
    const depletion = findDepletion(series);
    expect(depletion?.month).toBe(74);
    expect(depletion?.year).toBe(7);
    expect(depletion?.isOnYearBoundary).toBe(false);
  });

  it('When depletion falls exactly on a year boundary, Then it is flagged as such', () => {
    // Month 24 is the last month of year 2.
    const series = Array.from({ length: 60 }, (_, i) => (i < 23 ? 1000 : 0));
    const depletion = findDepletion(series);
    expect(depletion?.month).toBe(24);
    expect(depletion?.year).toBe(2);
    expect(depletion?.isOnYearBoundary).toBe(true);
  });
});

describe('Given a projection of a known length', () => {
  it('When year boundaries are requested, Then every whole year inside the series is returned as a month index', () => {
    // 36 months -> boundaries at months 12, 24, 36.
    expect(yearBoundaries(36)).toEqual([
      { year: 1, month: 12, monthIndex: 11 },
      { year: 2, month: 24, monthIndex: 23 },
      { year: 3, month: 36, monthIndex: 35 },
    ]);
  });

  it('When the series stops part-way through a year, Then the incomplete year gets no boundary', () => {
    // A tick at month 36 on a 30-month series would sit off the end of the axis.
    expect(yearBoundaries(30).map((b) => b.month)).toEqual([12, 24]);
  });

  it('When the series is shorter than a year, Then there are no boundaries at all', () => {
    expect(yearBoundaries(11)).toEqual([]);
  });

  it('When the series is empty, Then there are no boundaries', () => {
    expect(yearBoundaries(0)).toEqual([]);
  });
});
