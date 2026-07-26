/**
 * Unit tests for display formatting.
 *
 * The spec bans point estimates where a range is honest (§5.3), so the band
 * formatter is part of the contract, not a cosmetic helper.
 */
import { describe, it, expect } from 'vitest';
import { formatCents, formatMonths, formatRunwayBand, formatPercent } from './format';

describe('Given money in cents', () => {
  it('When formatted, Then it reads as whole dollars', () => {
    expect(formatCents(620_000)).toBe('$6,200');
    expect(formatCents(0)).toBe('$0');
  });
});

describe('Given a duration in months', () => {
  it('When under a year, Then it reads in months', () => {
    expect(formatMonths(7)).toBe('7 months');
    expect(formatMonths(1)).toBe('1 month');
  });

  it('When over a year, Then it reads in plain-language years', () => {
    expect(formatMonths(74)).toBe('about 6.2 years');
    expect(formatMonths(120)).toBe('about 10 years');
  });

  it('When the money never runs out, Then it says so rather than showing zero', () => {
    expect(formatMonths(null)).toBe('indefinitely');
  });
});

describe('Given a runway band', () => {
  it('When the bounds are far apart, Then a range is shown, not a false-precision point', () => {
    expect(formatRunwayBand(72, 96)).toBe('roughly 6–8 years');
  });

  it('When the bounds round to the same figure, Then a single figure is enough', () => {
    expect(formatRunwayBand(72, 72)).toBe('roughly 6 years');
  });

  it('When there is no depletion, Then it states that income covers the cost', () => {
    expect(formatRunwayBand(null, null)).toContain('Income covers the cost');
  });
});

describe('Given a rate', () => {
  it('When formatted, Then it reads as a percentage', () => {
    expect(formatPercent(0.045, 1)).toBe('4.5%');
    expect(formatPercent(0.04)).toBe('4%');
  });
});
