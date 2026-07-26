/**
 * All-In Cost Engine (spec §6.1).
 *
 * The headline finding of the research: the advertised base rate is not the
 * price. Care-level tiers, one-time community fees, à la carte add-ons and
 * annual escalators are routinely absent from the brochure, and a calculator
 * that multiplies a median by twelve reproduces exactly the budgeting error
 * that puts families into debt.
 *
 * Pure functions only — no React, no storage, no ambient clock.
 */
import type { CareScenario, CareType } from '../schemas';
import {
  resolveCost,
  hourlyToMonthlyCents,
  type FigureConfidence,
} from '../data/costOfCare';

/**
 * Days per month used to pro-rate the published adult day care monthly figure
 * down to a part-time schedule. Roughly a full weekday month; the pro-rating is
 * linear and is labelled as an estimate in the UI rather than presented as a
 * surveyed part-time rate.
 */
export const ADULT_DAY_FULL_TIME_DAYS_PER_MONTH = 22;

export interface CostBreakdown {
  /** The number a family is quoted or sees advertised. */
  readonly advertisedBaseCents: number;
  readonly careLevelTierCents: number;
  readonly addOnsCents: number;
  readonly ancillaryMonthlyCents: number;
  /** What actually lands on the statement every month. */
  readonly allInMonthlyCents: number;
  /** Community fee plus any one-time ancillary costs. */
  readonly oneTimeCents: number;
  /**
   * §6.5b — the upfront entry fee of an Independent Living buy-in contract.
   * Always 0 unless `scenario.fees.buyInContract` is set and the care type is
   * `independent_living`. Surfaced as its own `part` so the derivation panel
   * (`Format a Total and Its Parts at the Same Precision`) can show it
   * alongside communityFeeCents and ancillaryOneTimeCents without lumping
   * them. `oneTimeCents === communityFeeCents + ancillaryOneTimeCents +
   * buyInEntryCents` is asserted by the invariant tests.
   */
  readonly buyInEntryCents: number;
  /** Month one, including the one-time costs. */
  readonly firstMonthCents: number;
  /** How far above the advertised rate the real monthly cost sits, in percent. */
  readonly deltaPercent: number;
  /** True when no state figure existed and the national median was used. */
  readonly isNationalFallback: boolean;
  /** Provenance of the underlying reference figure, or null for a user override. */
  readonly confidence: FigureConfidence | null;
  readonly usedOverride: boolean;
}

/** The advertised/base monthly rate for a scenario, before any extras. */
export function baseMonthlyCents(scenario: CareScenario): {
  cents: number;
  isNationalFallback: boolean;
  confidence: FigureConfidence | null;
  usedOverride: boolean;
} {
  if (scenario.costOverrideCents !== undefined) {
    return {
      cents: scenario.costOverrideCents,
      isNationalFallback: false,
      confidence: null,
      usedOverride: true,
    };
  }

  const resolved = resolveCost(scenario.careType, scenario.stateCode);
  if (!resolved) {
    return { cents: 0, isNationalFallback: false, confidence: null, usedOverride: false };
  }

  const { entry, isNationalFallback } = resolved;
  const meta = {
    isNationalFallback,
    confidence: entry.confidence,
    usedOverride: false,
  };

  if (entry.medianHourlyCents !== undefined) {
    const hours = scenario.hoursPerWeek ?? 0;
    return { cents: hourlyToMonthlyCents(entry.medianHourlyCents, hours), ...meta };
  }

  if (scenario.careType === 'adult_day_care' && entry.medianMonthlyCents !== undefined) {
    const days = scenario.daysPerMonth ?? ADULT_DAY_FULL_TIME_DAYS_PER_MONTH;
    const perDay = entry.medianMonthlyCents / ADULT_DAY_FULL_TIME_DAYS_PER_MONTH;
    return { cents: Math.round(perDay * days), ...meta };
  }

  return { cents: entry.medianMonthlyCents ?? 0, ...meta };
}

/** Recurring ancillary spend, normalised to a monthly figure. */
export function ancillaryMonthlyCents(scenario: CareScenario): number {
  return scenario.ancillary.reduce((sum, item) => {
    if (item.cadence === 'monthly') return sum + item.amountCents;
    if (item.cadence === 'annual') return sum + Math.round(item.amountCents / 12);
    return sum;
  }, 0);
}

/** Costs that land once, at the start. */
export function oneTimeCents(scenario: CareScenario): number {
  const ancillaryOneTime = scenario.ancillary
    .filter((item) => item.cadence === 'one_time')
    .reduce((sum, item) => sum + item.amountCents, 0);
  return (
    ancillaryOneTime +
    (scenario.fees?.communityFeeCents ?? 0) +
    (scenario.fees?.buyInContract?.entryCents ?? 0)
  );
}

export function computeCost(scenario: CareScenario): CostBreakdown {
  const base = baseMonthlyCents(scenario);
  const tier = scenario.fees?.careLevelTierCents ?? 0;
  const addOns = (scenario.fees?.addOns ?? []).reduce((sum, a) => sum + a.monthlyCents, 0);
  const ancillary = ancillaryMonthlyCents(scenario);

  // §6.5b — Independent Living with a buy-in contract uses the contract's
  // `monthlyServiceCentsRate` as the effective base monthly when no override
  // is set. This avoids hand-keying a base rate and makes the contract the
  // single source of truth for that option's recurring figure.
  const monthlyService =
    scenario.costOverrideCents === undefined &&
    scenario.careType === 'independent_living' &&
    scenario.fees?.buyInContract
      ? scenario.fees.buyInContract.monthlyServiceCentsRate
      : base.cents;

  const allIn = monthlyService + tier + addOns + ancillary;
  const deltaPercent =
    base.cents > 0 ? ((allIn - base.cents) / base.cents) * 100 : 0;

  // §6.5b — the one-time AGGREGATE is owned by `oneTimeCents()`. We surface
  // the buy-in entry fee here as its own PART so the derivation panel can
  // show it without lumping it into communityFeeCents or ancillaryOneTime.
  // The two never drift: `oneTimeCents === communityFeeCents + ancillaryOneTime
  // + buyInEntryCents` is asserted by the invariant test in cost.test.ts.
  const buyInEntryCents = scenario.fees?.buyInContract?.entryCents ?? 0;
  const oneTime = oneTimeCents(scenario);

  return {
    advertisedBaseCents: base.cents,
    careLevelTierCents: tier,
    addOnsCents: addOns,
    ancillaryMonthlyCents: ancillary,
    allInMonthlyCents: allIn,
    oneTimeCents: oneTime,
    buyInEntryCents,
    firstMonthCents: allIn + oneTime,
    deltaPercent,
    isNationalFallback: base.isNationalFallback,
    confidence: base.confidence,
    usedOverride: base.usedOverride,
  };
}

/** Monthly carrying cost of keeping the home running. */
export function housingCarryMonthlyCents(scenario: CareScenario): number {
  const h = scenario.housingCarry;
  if (!h) return 0;
  return (
    h.mortgageOrRentCents +
    h.utilitiesCents +
    h.propertyTaxMonthlyCents +
    h.insuranceMonthlyCents +
    h.groceriesCents +
    h.maintenanceMonthlyCents +
    h.transportCents
  );
}

/** True for care types billed by the hour. */
export function isHourlyCare(careType: CareType): boolean {
  return careType === 'in_home_homemaker' || careType === 'in_home_health_aide';
}
