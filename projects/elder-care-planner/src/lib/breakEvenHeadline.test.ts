/**
 * Unit tests for the break-even headline sentence (spec §11.11).
 *
 * The sentence is built in a pure module rather than in JSX for the same
 * reason `lib/recommendation.ts` is: the §5.4 neutral-voice constraint and the
 * §11.2 "do not name a best option" constraint are editorial rules that are
 * only enforceable if something asserts them. In JSX they would be a comment
 * nobody runs.
 *
 * The three properties worth stating up front, because they are what the tests
 * are actually protecting:
 *
 *  1. Every figure comes from `BreakEvenResult` / the §11.10 band. Nothing is
 *     recomputed, so the headline cannot drift from the chart beneath it.
 *  2. The crossover is a range, never a single hour (§1.1) — the rate is
 *     uncertain, so a point estimate is a false precision.
 *  3. The voice never addresses the reader and never recommends an option.
 */
import { describe, it, expect } from 'vitest';
import { computeBreakEven, type BreakEvenInput } from './engine/breakeven';
import { computeBreakEvenBand } from './engine/breakevenBand';
import { buildBreakEvenHeadline } from './breakEvenHeadline';
// The real formatter, not a copy of it. A test that re-implements the
// formatting it asserts against passes while the UI renders something else.
import { formatCents } from './format';

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

function headlineFor(overrides: Partial<BreakEvenInput> = {}) {
  const inp = input(overrides);
  const result = computeBreakEven(inp);
  const band = computeBreakEvenBand(inp, { lowRateCents: 3000, highRateCents: 4000 });
  return buildBreakEvenHeadline(result, band, inp.currentHoursPerWeek);
}

describe('Given a break-even comparison at a chosen number of hours', () => {
  it('When the headline is built, Then it names the selected hours and both monthly figures', () => {
    const result = computeBreakEven(input());
    const headline = headlineFor();

    expect(headline).toContain('40 hours a week');
    // Figures are the engine's, formatted — not recomputed here.
    expect(headline).toContain(formatCents(result.inHomeMonthlyCents));
    expect(headline).toContain(formatCents(result.residentialMonthlyCents));
  });

  it('When the headline is built, Then it states the difference between the two options', () => {
    const result = computeBreakEven(input());
    expect(headlineFor()).toContain(formatCents(result.monthlyDifferenceCents));
  });

  it('When the slider moves, Then the headline follows the new position rather than a default', () => {
    const at20 = headlineFor({ currentHoursPerWeek: 20 });
    const at60 = headlineFor({ currentHoursPerWeek: 60 });

    expect(at20).toContain('20 hours a week');
    expect(at60).toContain('60 hours a week');
    expect(at20).not.toBe(at60);
  });

  it('When the crossover is stated, Then it is a range rather than a single hour', () => {
    // §1.1: the rate is uncertain, so one crossover hour is false precision.
    // A range reads "between X and Y hours a week".
    expect(headlineFor()).toMatch(/between \d+(?:\.\d+)? and \d+(?:\.\d+)? hours a week/);
  });
});

describe('Given the editorial constraints the app holds itself to', () => {
  const cases: [string, Partial<BreakEvenInput>][] = [
    ['a typical plan', {}],
    ['zero paid hours', { currentHoursPerWeek: 0 }],
    ['residential already cheaper', { housingCarryMonthlyCents: 1_000_000 }],
    ['a very high hour count', { currentHoursPerWeek: 168 }],
    ['a zero hourly rate', { hourlyRateCents: 0 }],
  ];

  it.each(cases)(
    'When the headline is built for %s, Then it never addresses the reader in the second person',
    (_name, overrides) => {
      // §5.4. Sweeping every case kind rather than one: a new branch that
      // slips into "your" would otherwise pass by not being looked at (§9.3).
      const headline = headlineFor(overrides);
      expect(headline).not.toMatch(/\byour\b|\byou\b|\byours\b/i);
    },
  );

  it.each(cases)(
    'When the headline is built for %s, Then it never recommends choosing an option',
    (_name, overrides) => {
      // §11.2: the app declines to name a best option on purpose.
      const headline = headlineFor(overrides);
      expect(headline).not.toMatch(/\bshould\b|\brecommend|\bbest\b|\bchoose\b|\bopt for\b/i);
    },
  );

  it.each(cases)(
    'When the headline is built for %s, Then it is a non-empty sentence ending in a full stop',
    (_name, overrides) => {
      const headline = headlineFor(overrides);
      expect(headline.trim().length).toBeGreaterThan(0);
      expect(headline.trim().endsWith('.')).toBe(true);
    },
  );
});

describe('Given the degenerate cases the engine can return', () => {
  it('When residential is cheaper before any paid help, Then the headline says so rather than reporting a crossover', () => {
    // The engine sets residentialAlwaysCheaper; reporting "they cost the same
    // at 0 hours" would describe a crossing that does not exist.
    const headline = headlineFor({ housingCarryMonthlyCents: 1_000_000 });
    expect(headline).toMatch(/before any paid help/i);
    expect(headline).not.toMatch(/between \d/);
  });

  it('When the hourly rate is zero, Then the headline does not claim an unbounded crossover', () => {
    const headline = headlineFor({ hourlyRateCents: 0 });
    expect(headline).not.toMatch(/Infinity|NaN/);
  });

  it('When the two options cost the same, Then the headline reports parity rather than naming a cheaper one', () => {
    // Equal costs: in-home fixed + hours must land exactly on residential.
    const inp = input({
      housingCarryMonthlyCents: 620_000,
      inHomeAncillaryMonthlyCents: 0,
      currentHoursPerWeek: 0,
      residentialAllInMonthlyCents: 620_000,
    });
    const result = computeBreakEven(inp);
    const band = computeBreakEvenBand(inp, { lowRateCents: 3000, highRateCents: 4000 });
    expect(result.cheaperOption).toBe('equal');
    expect(buildBreakEvenHeadline(result, band, 0)).toMatch(/about the same/i);
  });
});
