/**
 * Plan orchestration — turns a stored Plan into everything the UI renders.
 *
 * Kept pure and separate from React so the whole result set is unit-testable in
 * one call, and so the UI cannot quietly introduce arithmetic of its own.
 */
import type { CareScenario, Plan } from '../schemas';
import { RESIDENTIAL_CARE_TYPES } from '../schemas';
import { computeCost, housingCarryMonthlyCents, type CostBreakdown } from './cost';
import type { RunwayInput, RunwayResult } from './runway';
import { computeSensitivity, type SensitivityResult } from './sensitivity';
import { computeSplit, type SplitResult } from './split';
import { computeBreakEven, type BreakEvenResult } from './breakeven';
import { NATIONAL_MEDIANS, resolveCost } from '../data/costOfCare';

/** National hourly aide rate, used to value unpaid family care hours. */
export function aideHourlyRateCents(stateCode: string): number {
  const resolved = resolveCost('in_home_health_aide', stateCode);
  return (
    resolved?.entry.medianHourlyCents ??
    NATIONAL_MEDIANS.find((e) => e.careType === 'in_home_health_aide')?.medianHourlyCents ??
    0
  );
}

export function activeScenario(plan: Plan): CareScenario | null {
  if (plan.scenarios.length === 0) return null;
  return (
    plan.scenarios.find((s) => s.id === plan.activeScenarioId) ?? plan.scenarios[0]
  );
}

export function buildRunwayInput(plan: Plan, scenario: CareScenario): RunwayInput {
  const cost = computeCost(scenario);
  const capacity = plan.contributors.reduce(
    (sum, c) => sum + (c.monthlyCapacityCents ?? 0),
    0,
  );

  return {
    // Ancillary is carried separately so it inflates at the general rate rather
    // than at the (faster) care escalator.
    allInMonthlyCents: cost.allInMonthlyCents - cost.ancillaryMonthlyCents,
    oneTimeCents: cost.oneTimeCents,
    annualEscalatorRate:
      scenario.fees?.annualEscalatorRate ?? plan.assumptions.careInflationRate,
    ancillaryMonthlyCents: cost.ancillaryMonthlyCents,
    generalInflationRate: plan.assumptions.generalInflationRate,
    careLevelIncrease:
      scenario.fees?.careLevelIncreaseAtMonth !== undefined &&
      scenario.fees?.careLevelIncreaseCents !== undefined
        ? {
            atMonth: scenario.fees.careLevelIncreaseAtMonth,
            cents: scenario.fees.careLevelIncreaseCents,
          }
        : undefined,
    homeSaleProceeds: plan.homeSaleProceeds,
    income: plan.income,
    assets: plan.assets,
    projectionYears: plan.assumptions.projectionYears,
    contributorCapacityCents: capacity > 0 ? capacity : undefined,
  };
}

export interface ScenarioResult {
  readonly scenario: CareScenario;
  readonly cost: CostBreakdown;
  readonly runway: RunwayResult;
  readonly sensitivity: SensitivityResult;
}

export function computeScenario(plan: Plan, scenario: CareScenario): ScenarioResult {
  const cost = computeCost(scenario);
  const input = buildRunwayInput(plan, scenario);
  const sensitivity = computeSensitivity(input);
  return { scenario, cost, runway: sensitivity.baseline, sensitivity };
}

export interface PlanResult {
  readonly active: ScenarioResult | null;
  readonly allScenarios: readonly ScenarioResult[];
  readonly split: SplitResult | null;
  readonly breakEven: BreakEvenResult | null;
}

/**
 * Break-even only means something when the plan holds both an hourly in-home
 * scenario and a residential one to compare it against.
 */
export function breakEvenBetween(
  inHome: CareScenario,
  residential: CareScenario,
): BreakEvenResult {
  const residentialCost = computeCost(residential);
  const inHomeCost = computeCost(inHome);

  return computeBreakEven({
    hourlyRateCents: aideHourlyRateCents(inHome.stateCode),
    currentHoursPerWeek: inHome.hoursPerWeek ?? 0,
    housingCarryMonthlyCents: housingCarryMonthlyCents(inHome),
    inHomeAncillaryMonthlyCents: inHomeCost.ancillaryMonthlyCents,
    residentialAllInMonthlyCents: residentialCost.allInMonthlyCents,
  });
}

export function computeBreakEvenForPlan(plan: Plan): BreakEvenResult | null {
  const inHome = plan.scenarios.find(
    (s) => s.careType === 'in_home_homemaker' || s.careType === 'in_home_health_aide',
  );
  const residential = plan.scenarios.find((s) => RESIDENTIAL_CARE_TYPES.includes(s.careType));
  if (!inHome || !residential) return null;
  return breakEvenBetween(inHome, residential);
}

export function computePlan(plan: Plan): PlanResult {
  const all = plan.scenarios.map((s) => computeScenario(plan, s));
  const activeSc = activeScenario(plan);
  const active = activeSc ? all.find((r) => r.scenario.id === activeSc.id) ?? null : null;

  const split = active
    ? computeSplit({
        shortfallCents: active.runway.monthlyShortfallCents,
        contributors: plan.contributors,
        method: plan.assumptions.splitMethod,
        aideHourlyRateCents: aideHourlyRateCents(active.scenario.stateCode),
      })
    : null;

  return {
    active,
    allScenarios: all,
    split,
    breakEven: computeBreakEvenForPlan(plan),
  };
}
