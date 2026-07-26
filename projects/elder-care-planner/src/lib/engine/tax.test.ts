/**
 * Unit tests for the medical expense deduction estimate.
 */
import { describe, it, expect } from 'vitest';
import { estimateMedicalDeduction, AGI_THRESHOLD_RATE } from './tax';

describe('Given an AGI of $100,000 and $20,000 of qualifying medical expenses', () => {
  const result = estimateMedicalDeduction({
    adjustedGrossIncomeCents: 10_000_000,
    qualifyingMedicalExpensesCents: 2_000_000,
    supportingContributorCount: 1,
    anyContributorProvidesMajoritySupport: true,
  });

  it('When the threshold is applied, Then it is 7.5% of AGI', () => {
    expect(AGI_THRESHOLD_RATE).toBe(0.075);
    expect(result.thresholdCents).toBe(750_000); // $7,500
  });

  it('When the deduction is estimated, Then only the excess above the threshold counts', () => {
    // 2,000,000 - 750,000 = 1,250,000 = $12,500
    expect(result.deductibleCents).toBe(1_250_000);
    expect(result.meetsThreshold).toBe(true);
  });
});

describe('Given expenses below the threshold', () => {
  it('When estimated, Then the deductible amount is zero, never negative', () => {
    const result = estimateMedicalDeduction({
      adjustedGrossIncomeCents: 10_000_000,
      qualifyingMedicalExpensesCents: 500_000,
      supportingContributorCount: 1,
      anyContributorProvidesMajoritySupport: true,
    });
    expect(result.deductibleCents).toBe(0);
    expect(result.meetsThreshold).toBe(false);
  });
});

describe('Given three siblings splitting support with nobody past half', () => {
  it('When estimated, Then the multiple support situation is flagged', () => {
    const result = estimateMedicalDeduction({
      adjustedGrossIncomeCents: 10_000_000,
      qualifyingMedicalExpensesCents: 2_000_000,
      supportingContributorCount: 3,
      anyContributorProvidesMajoritySupport: false,
    });
    expect(result.multipleSupportFlag).toBe(true);
  });

  it('When one sibling does provide most of the support, Then no flag is raised', () => {
    const result = estimateMedicalDeduction({
      adjustedGrossIncomeCents: 10_000_000,
      qualifyingMedicalExpensesCents: 2_000_000,
      supportingContributorCount: 3,
      anyContributorProvidesMajoritySupport: true,
    });
    expect(result.multipleSupportFlag).toBe(false);
  });
});
