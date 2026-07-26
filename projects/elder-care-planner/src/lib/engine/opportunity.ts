/**
 * Caregiver Opportunity Cost (spec §6.7).
 *
 * When a family member cuts their hours to provide care, the cost is real and
 * almost never counted. Around 40% of family caregivers reduce or leave work,
 * and this is frequently the largest number in the whole analysis — it is simply
 * invisible because nobody invoices for it.
 *
 * Note what this deliberately does not do: it does not put a dollar figure on
 * lost Social Security benefits. That calculation needs a full 35-year earnings
 * history the app does not have, so it raises a flag and points at SSA's own
 * calculator instead of inventing a number.
 */
import type { CaregiverImpact } from '../schemas';

export interface OpportunityCostResult {
  readonly contributorId: string;
  readonly lostGrossWagesCents: number;
  readonly lostNetWagesCents: number;
  readonly lostEmployerMatchCents: number;
  /** Net wages plus forgone employer retirement match. */
  readonly totalCents: number;
  /** True when reduced work years may affect the Social Security average. */
  readonly socialSecurityFlag: boolean;
}

/** Full-time hours per week, the basis for the proportion of income given up. */
const FULL_TIME_HOURS = 40;

/**
 * Years of reduced work beyond which the 35-year earnings average used for
 * Social Security is likely to be affected enough to be worth checking.
 */
const SS_FLAG_YEARS_THRESHOLD = 3;

export function computeOpportunityCost(impact: CaregiverImpact): OpportunityCostResult {
  const proportion = Math.min(1, impact.hoursReducedPerWeek / FULL_TIME_HOURS);
  const lostGross = Math.round(
    impact.currentAnnualSalaryCents * proportion * impact.yearsOfReducedWork,
  );
  const lostNet = Math.round(lostGross * (1 - impact.marginalTaxRate));
  const lostMatch = Math.round(lostGross * impact.employerMatchRate);

  return {
    contributorId: impact.contributorId,
    lostGrossWagesCents: lostGross,
    lostNetWagesCents: lostNet,
    lostEmployerMatchCents: lostMatch,
    totalCents: lostNet + lostMatch,
    socialSecurityFlag:
      impact.yearsOfReducedWork >= SS_FLAG_YEARS_THRESHOLD && impact.hoursReducedPerWeek > 0,
  };
}

export function totalOpportunityCostCents(impacts: readonly CaregiverImpact[]): number {
  return impacts.reduce((sum, i) => sum + computeOpportunityCost(i).totalCents, 0);
}
