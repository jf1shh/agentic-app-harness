import { describe, it, expect } from 'vitest';
import {
  FEE_RANGE_SOURCE,
  TYPICAL_FEE_RANGES,
  ANNUAL_ESCALATOR_BAND,
  CARE_INFLATION_BAND,
} from './feeStructures';

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; proved by mutation.
//
// These ranges are what the app uses to warn a family about the add-on fees
// that turn an advertised rate into the real bill, and the escalator band is
// "the quietest driver of a plan running out early". An inverted or zeroed band
// silently removes the warning rather than showing a wrong number, which is the
// failure mode worth guarding.

describe('TYPICAL_FEE_RANGES', () => {
  it('Given the fee table, When ids are collected, Then each fee appears once', () => {
    const ids = TYPICAL_FEE_RANGES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Given every fee range, When its bounds are read, Then the low bound does not exceed the high bound', () => {
    // An inverted range renders as "$2,000–$500" and reads as a bug to the user.
    for (const fee of TYPICAL_FEE_RANGES) {
      expect(fee.lowCents, `'${fee.id}' is inverted`).toBeLessThanOrEqual(fee.highCents);
    }
  });

  it('Given every fee range, When its bounds are read, Then both are positive amounts', () => {
    // A zero low bound presents an add-on as potentially free.
    for (const fee of TYPICAL_FEE_RANGES) {
      expect(fee.lowCents, `'${fee.id}' has a zero or negative low bound`).toBeGreaterThan(0);
      expect(fee.highCents).toBeGreaterThan(0);
    }
  });

  it('Given every fee range, When its cadence is read, Then it is either monthly or one-time', () => {
    // Cadence decides whether the figure is multiplied across the projection;
    // getting it wrong is a 12x error, not a rounding one.
    for (const fee of TYPICAL_FEE_RANGES) {
      expect(['monthly', 'one_time'], `'${fee.id}' has an unknown cadence`).toContain(fee.cadence);
    }
  });

  it('Given every fee range, When its copy is read, Then it carries a label and an explanation', () => {
    for (const fee of TYPICAL_FEE_RANGES) {
      expect(fee.label, `'${fee.id}' has no label`).toBeTruthy();
      expect(fee.explanation.length, `'${fee.id}' has no explanation`).toBeGreaterThan(20);
    }
  });

  it('Given the move-in fee, When its cadence is read, Then it is one-time rather than recurring', () => {
    // Charged once at move-in. Treating it as monthly would inflate a
    // multi-year projection by tens of thousands of dollars.
    const communityFee = TYPICAL_FEE_RANGES.find((f) => f.id === 'community_fee');
    expect(communityFee?.cadence).toBe('one_time');
  });

  it('Given the fee-range source, When it is inspected, Then it declares itself non-authoritative', () => {
    // Compiled from consumer guidance, not a primary survey. Claiming otherwise
    // would be the "laundering an uncertain figure" failure the §6 lesson names.
    expect(FEE_RANGE_SOURCE.isAuthoritative).toBe(false);
    expect(FEE_RANGE_SOURCE.description).toBeTruthy();
  });
});

describe('the projection bands', () => {
  it.each([
    ['annual escalator', ANNUAL_ESCALATOR_BAND],
    ['care inflation', CARE_INFLATION_BAND],
  ])('Given the %s band, When its bounds are read, Then the default sits inside low..high', (_name, band) => {
    // A default outside its own band means the app projects with a rate it
    // simultaneously describes as implausible.
    expect(band.low).toBeLessThan(band.high);
    expect(band.default).toBeGreaterThanOrEqual(band.low);
    expect(band.default).toBeLessThanOrEqual(band.high);
  });

  it.each([
    ['annual escalator', ANNUAL_ESCALATOR_BAND],
    ['care inflation', CARE_INFLATION_BAND],
  ])('Given the %s band, When its values are read, Then they are fractions rather than percentages', (_name, band) => {
    // 4 instead of 0.04 compounds to a 400% annual rise and would blow up every
    // runway projection.
    for (const value of [band.low, band.high, band.default]) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('Given both bands, When they are compared, Then care inflation is allowed to run ahead of the rate escalator', () => {
    // The stated premise of the module: care inflation outpaces general rises.
    expect(CARE_INFLATION_BAND.high).toBeGreaterThanOrEqual(ANNUAL_ESCALATOR_BAND.high);
    expect(CARE_INFLATION_BAND.default).toBeGreaterThanOrEqual(ANNUAL_ESCALATOR_BAND.default);
  });
});
