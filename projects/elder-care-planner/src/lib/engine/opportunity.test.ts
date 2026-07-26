/**
 * Unit tests for caregiver opportunity cost.
 *
 * Note the deliberate absence: no dollar figure is produced for lost Social
 * Security benefits. That needs a full 35-year earnings history the app does not
 * have, so the engine raises a flag instead of inventing a number.
 */
import { describe, it, expect } from 'vitest';
import { computeOpportunityCost, totalOpportunityCostCents } from './opportunity';
import type { CaregiverImpact } from '../schemas';

function impact(overrides: Partial<CaregiverImpact> = {}): CaregiverImpact {
  return {
    contributorId: 'c1',
    currentAnnualSalaryCents: 8_000_000, // $80,000
    hoursReducedPerWeek: 20,
    employerMatchRate: 0.04,
    yearsOfReducedWork: 5,
    marginalTaxRate: 0.22,
    ...overrides,
  };
}

describe('Given a caregiver who halves their hours for five years', () => {
  const result = computeOpportunityCost(impact());

  it('When wages are computed, Then half the salary is forgone for five years', () => {
    // 8,000,000 * (20/40) * 5 = 20,000,000 cents = $200,000 gross.
    expect(result.lostGrossWagesCents).toBe(20_000_000);
  });

  it('When tax is applied, Then the net figure is what the household actually loses', () => {
    // 20,000,000 * (1 - 0.22) = 15,600,000 = $156,000.
    expect(result.lostNetWagesCents).toBe(15_600_000);
  });

  it('When retirement is considered, Then the forgone employer match is counted too', () => {
    // 20,000,000 * 0.04 = 800,000 = $8,000.
    expect(result.lostEmployerMatchCents).toBe(800_000);
    expect(result.totalCents).toBe(16_400_000); // $164,000
  });

  it('When the reduction spans years, Then Social Security is flagged, not quantified', () => {
    expect(result.socialSecurityFlag).toBe(true);
    expect(Object.keys(result)).not.toContain('lostSocialSecurityCents');
  });
});

describe('Given a caregiver who leaves work entirely', () => {
  it('When hours exceed full time, Then the loss is capped at the whole salary', () => {
    const result = computeOpportunityCost(
      impact({ hoursReducedPerWeek: 60, yearsOfReducedWork: 1 }),
    );
    // Capped at 100% of salary — you cannot forgo more than you earned.
    expect(result.lostGrossWagesCents).toBe(8_000_000);
  });
});

describe('Given a caregiver who has not reduced their hours', () => {
  it('When computed, Then there is no cost and no Social Security flag', () => {
    const result = computeOpportunityCost(impact({ hoursReducedPerWeek: 0 }));
    expect(result.totalCents).toBe(0);
    expect(result.socialSecurityFlag).toBe(false);
  });
});

describe('Given a short reduction of under three years', () => {
  it('When computed, Then the earnings-average flag stays off', () => {
    expect(computeOpportunityCost(impact({ yearsOfReducedWork: 2 })).socialSecurityFlag).toBe(
      false,
    );
  });
});

describe('Given two family members who both cut back', () => {
  it('When totalled, Then the household cost is the sum of both', () => {
    const total = totalOpportunityCostCents([
      impact({ contributorId: 'c1' }),
      impact({ contributorId: 'c2', hoursReducedPerWeek: 10 }),
    ]);
    // 16,400,000 + (8,000,000 * 0.25 * 5 = 10,000,000 gross ->
    // net 7,800,000 + match 400,000 = 8,200,000) = 24,600,000
    expect(total).toBe(24_600_000);
  });
});
