/**
 * Derivations for every headline figure (spec §6.10).
 *
 * Each builder takes engine *output* and rewrites it as a sequence a reader can
 * follow with a calculator. Nothing here recalculates: every cents value is read
 * from a `CostBreakdown`, a `RunwayResult`, a `BreakEvenResult`, a `SplitResult`
 * or the inputs those engines were given. That constraint is the whole point —
 * an explanation that did its own arithmetic could drift from the engine, and a
 * confidently wrong derivation is worse than none.
 *
 * Voice follows spec §5.4: no second person. The reader may be looking at these
 * numbers because a sibling sent them, and the method has to read as the tool's
 * rather than as one side of an argument.
 */
import type { Plan, CareScenario, Contributor, ExpenseCategory, SplitMethod } from '../schemas';
import type { CostBreakdown } from '../engine/cost';
import type { RunwayInput, RunwayResult } from '../engine/runway';
import type { SensitivityResult } from '../engine/sensitivity';
import type { BreakEvenResult } from '../engine/breakeven';
import type { SplitResult } from '../engine/split';
import type { LedgerSummary } from '../engine/ledger';
import {
  DEFAULT_WEIGHT,
  MAX_SCORE,
  MAX_WEIGHT,
  WEIGHT_LABELS,
  formatComposite,
  type FacilityFit,
} from '../engine/fit';
import { FACILITY_DIMENSIONS, type FacilityDimension } from '../schemas';
import type { ScenarioResult } from '../engine/plan';
import { buildRunwayInput } from '../engine/plan';
import { incomeAtMonth } from '../engine/runway';
import { ADULT_DAY_FULL_TIME_DAYS_PER_MONTH, buyInContractFor } from '../engine/cost';
import { PLANNING_BANDS } from '../engine/sensitivity';
import {
  CARE_TYPE_LABELS,
  COST_DATA_SOURCE,
  SURVEY_HOURS_PER_WEEK,
  resolveCost,
} from '../data/costOfCare';
import { ANNUAL_ESCALATOR_BAND, FEE_RANGE_SOURCE, TYPICAL_FEE_RANGES } from '../data/feeStructures';
import { EXPENSE_CATEGORY_LABELS } from '../data/expenseCategories';
import { formatCents, formatCentsPrecise, formatMonths, formatPercent, formatRunwayBand } from '../format';
import type { Explanation, ExplainStep, ExplanationSet } from './types';

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/** Dimension keys as the labels a reader recognises, in display order. */
function dimensionLabels(dimensions: readonly FacilityDimension[]): string {
  return FACILITY_DIMENSIONS.filter((d) => dimensions.includes(d.dimension))
    .map((d) => d.label.toLowerCase())
    .join(', ');
}

/** Provenance lines shared by every explanation that leans on a published median. */
function costSourceLines(scenario: CareScenario, cost: CostBreakdown): string[] {
  if (cost.usedOverride) {
    return [
      'This figure is a price quoted to the family, not a published median. A real quote from a specific provider is the most reliable basis available, and it replaces the survey figure entirely.',
    ];
  }

  const lines = [
    `${COST_DATA_SOURCE.name}, ${COST_DATA_SOURCE.surveyYear} survey (fieldwork ${COST_DATA_SOURCE.surveyPeriod}), transcribed on ${COST_DATA_SOURCE.retrievedOn} from ${COST_DATA_SOURCE.url}.`,
  ];

  if (cost.isNationalFallback) {
    lines.push(
      'No state-level figure has been transcribed and verified for this care type, so the national median is used. That is a labelled fallback rather than an estimate for this state — care prices vary widely by state, and a quoted local price will be much closer to the truth.',
    );
  }

  const entryNote = resolveCost(scenario.careType, scenario.stateCode)?.entry.note;
  if (entryNote) lines.push(entryNote);

  if (cost.confidence === 'needs_verification') {
    lines.push(
      'Confidence: this figure comes from a secondary summary and has not yet been checked against the published survey.',
    );
  }
  if (cost.confidence === 'derived') {
    lines.push(
      'Confidence: this care type is not separately surveyed, so the figure is derived from one that is. It is a placeholder for a real quote, not a measurement.',
    );
  }
  if (cost.confidence === 'verified') {
    lines.push('Confidence: cross-checked against two independent reports of the survey.');
  }

  return lines;
}

/* ------------------------------------------------------------------ */
/* 1. Where the advertised base rate comes from                        */
/* ------------------------------------------------------------------ */

function explainBaseRate(scenario: CareScenario, cost: CostBreakdown): Explanation {
  const careLabel = CARE_TYPE_LABELS[scenario.careType];
  const resolved = resolveCost(scenario.careType, scenario.stateCode);
  const steps: ExplainStep[] = [];
  const assumptions: string[] = [];
  let plainLanguage: string;
  let formula: string;

  if (cost.usedOverride) {
    plainLanguage =
      'This is the price quoted for this specific provider. Because a real quote was entered, no published median is used anywhere in the plan — the quote is taken as given.';
    formula = 'advertised base rate = the price quoted by the provider';
    steps.push({
      kind: 'input',
      label: 'Monthly price quoted by the provider',
      valueCents: cost.advertisedBaseCents,
    });
  } else if (resolved?.entry.medianHourlyCents !== undefined) {
    const hourly = resolved.entry.medianHourlyCents;
    const hours = scenario.hoursPerWeek ?? 0;
    plainLanguage =
      'Care at home is priced by the hour, so a monthly figure has to be built from an hourly rate. A month is not four weeks: it averages 52 ÷ 12 = 4.33 weeks, and using four instead understates a year of care by about a month of it.';
    formula = 'monthly = hourly rate × paid hours a week × 52 weeks ÷ 12 months';
    steps.push({
      kind: 'reference',
      label: `Published median hourly rate for ${careLabel.toLowerCase()}`,
      valueCents: hourly,
      workingOut: 'per hour',
    });
    steps.push({
      kind: 'input',
      label: 'Paid hours a week',
      valueText: `${hours} hours`,
    });
    steps.push({
      kind: 'note',
      label: `The published annual figure for this care assumes ${SURVEY_HOURS_PER_WEEK} hours a week. The hours above are the ones entered here, not the survey's.`,
    });
    steps.push({
      kind: 'result',
      label: 'Advertised base rate, monthly',
      workingOut: `${formatCentsPrecise(hourly)} × ${hours} hours × ${WEEKS_PER_YEAR} weeks ÷ ${MONTHS_PER_YEAR} months`,
      valueCents: cost.advertisedBaseCents,
    });
    assumptions.push('A year has 52 weeks, giving 4.33 weeks in an average month.');
  } else if (
    scenario.careType === 'adult_day_care' &&
    resolved?.entry.medianMonthlyCents !== undefined
  ) {
    const days = scenario.daysPerMonth ?? ADULT_DAY_FULL_TIME_DAYS_PER_MONTH;
    plainLanguage =
      'Adult day care is published as a full-time monthly figure. Most families use it part-time, so the published figure is divided down to a daily rate and multiplied back up by the days actually attended.';
    formula = 'monthly = published monthly ÷ full-time days × days attended';
    steps.push({
      kind: 'reference',
      label: 'Published median, full-time month',
      valueCents: resolved.entry.medianMonthlyCents,
    });
    steps.push({
      kind: 'input',
      label: 'Days attended a month',
      valueText: `${days} days`,
    });
    steps.push({
      kind: 'result',
      label: 'Advertised base rate, monthly',
      workingOut: `${formatCentsPrecise(resolved.entry.medianMonthlyCents)} ÷ ${ADULT_DAY_FULL_TIME_DAYS_PER_MONTH} days × ${days} days`,
      valueCents: cost.advertisedBaseCents,
    });
    assumptions.push(
      `A full-time month is treated as ${ADULT_DAY_FULL_TIME_DAYS_PER_MONTH} attended days, and the pro-rating is straight-line. Providers often price part-time attendance at a higher day rate than this implies.`,
    );
  } else if (buyInContractFor(scenario)) {
    plainLanguage =
      'Independent living is housing rather than a surveyed category of care, so there is no published median to compare against. This figure is the monthly service fee the community itself sets out in its contract — a real number from a real document, not an average.';
    formula = 'advertised base rate = the monthly service fee in the community’s contract';
    steps.push({
      kind: 'result',
      label: 'Monthly service fee set out in the community’s contract',
      valueCents: cost.advertisedBaseCents,
    });
    assumptions.push(
      'The entry fee is not in this figure. It is charged once, at move-in, and appears in the first-month total instead.',
    );
  } else {
    plainLanguage =
      'Residential care is advertised as a monthly rent. This is the published median for this type of care — the middle of the market, meaning half of providers charge more. It is a starting point for a budget, not a price anyone has been offered.';
    formula = 'advertised base rate = published median monthly rate for this care type';
    steps.push({
      kind: 'result',
      label: `Published median monthly rate, ${careLabel.toLowerCase()}`,
      valueCents: cost.advertisedBaseCents,
    });
  }

  if (steps[steps.length - 1]?.kind !== 'result') {
    steps.push({
      kind: 'result',
      label: 'Advertised base rate, monthly',
      valueCents: cost.advertisedBaseCents,
    });
  }

  return {
    id: 'base-rate',
    title: 'Where the advertised base rate comes from',
    question: 'How is the advertised base rate worked out?',
    plainLanguage,
    formula,
    steps,
    assumptions,
    sources: costSourceLines(scenario, cost),
    caveats: [
      'A median is the middle of a wide range, not a typical local price. Half of providers charge more than this.',
      'This figure is the advertised rate only. Everything a community bills on top of rent is handled in the all-in cost.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 2. Advertised rate -> realistic all-in cost                         */
/* ------------------------------------------------------------------ */

function explainAllIn(scenario: CareScenario, cost: CostBreakdown): Explanation {
  const steps: ExplainStep[] = [
    {
      kind: 'add',
      label: 'Advertised base rate',
      valueCents: cost.advertisedBaseCents,
    },
  ];

  if (cost.careLevelTierCents > 0) {
    steps.push({
      kind: 'add',
      label: 'Care-level surcharge',
      workingOut: 'The tier charged on top of rent for the current level of help',
      valueCents: cost.careLevelTierCents,
    });
  }

  for (const addOn of scenario.fees?.addOns ?? []) {
    steps.push({
      kind: 'add',
      label: addOn.label,
      workingOut: 'Billed separately from the base rate',
      valueCents: addOn.monthlyCents,
    });
  }

  for (const item of scenario.ancillary) {
    if (item.cadence === 'monthly') {
      steps.push({ kind: 'add', label: item.label, valueCents: item.amountCents });
    } else if (item.cadence === 'annual') {
      steps.push({
        kind: 'add',
        label: `${item.label} (annual, spread over the year)`,
        workingOut: `${formatCentsPrecise(item.amountCents)} ÷ 12 months`,
        valueCents: Math.round(item.amountCents / MONTHS_PER_YEAR),
      });
    }
  }

  steps.push({
    kind: 'result',
    label: 'Realistic all-in cost, every month',
    valueCents: cost.allInMonthlyCents,
  });

  if (cost.deltaPercent > 0) {
    steps.push({
      kind: 'note',
      label: `That is ${Math.round(cost.deltaPercent)}% above the advertised rate, worked out as (${formatCents(
        cost.allInMonthlyCents,
      )} − ${formatCents(cost.advertisedBaseCents)}) ÷ ${formatCents(
        cost.advertisedBaseCents,
      )} × 100.`,
    });
  }

  const tierRange = TYPICAL_FEE_RANGES.find((r) => r.id === 'care_level_tier');

  return {
    id: 'all-in',
    title: 'How the advertised rate becomes the real monthly bill',
    question: 'How is the realistic all-in monthly cost worked out?',
    plainLanguage:
      'The single most common budgeting error in this decision is treating the advertised rent as the cost. Care levels, medication management, supplies and transport are usually billed separately, and they are what turns a brochure figure into a statement that arrives every month. This adds them all up.',
    formula:
      'all-in monthly = advertised base rate + care-level surcharge + services billed separately + everyday costs',
    steps,
    assumptions: [
      `Care costs are assumed to rise ${formatPercent(
        scenario.fees?.annualEscalatorRate ?? ANNUAL_ESCALATOR_BAND.default,
        1,
      )} a year from here, compounding. That increase is applied in the projection, not in this month's figure.`,
      'Only the fees entered here are counted. Nothing is added on the family’s behalf.',
    ],
    sources: [
      ...costSourceLines(scenario, cost),
      tierRange
        ? `Typical care-level tiers run ${formatCents(tierRange.lowCents)}–${formatCents(
            tierRange.highCents,
          )} a month per level. ${FEE_RANGE_SOURCE.description}`
        : '',
    ].filter(Boolean),
    caveats: [
      'Care-level tiers are reassessed by the provider, often without the base rent changing at all. A tier the family has not been told about yet will not appear here.',
      'One-time move-in costs are not in this figure — they are shown separately in the first-month total.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 3. Month one                                                        */
/* ------------------------------------------------------------------ */

function explainFirstMonth(scenario: CareScenario, cost: CostBreakdown): Explanation {
  const steps: ExplainStep[] = [
    { kind: 'add', label: 'Realistic all-in cost for the month', valueCents: cost.allInMonthlyCents },
  ];

  const communityFee = scenario.fees?.communityFeeCents ?? 0;
  if (communityFee > 0) {
    steps.push({
      kind: 'add',
      label: 'Community or move-in fee, charged once',
      valueCents: communityFee,
    });
  }
  // §6.5b — the entry fee dwarfs every other line here, so it has to appear as
  // its own part. `firstMonthCents` already includes it; omitting the step
  // would state a total the parts never reach.
  if (cost.buyInEntryCents > 0) {
    steps.push({
      kind: 'add',
      label: 'Independent living entry fee, paid once on moving in',
      valueCents: cost.buyInEntryCents,
    });
  }
  for (const item of scenario.ancillary) {
    if (item.cadence === 'one_time') {
      steps.push({ kind: 'add', label: `${item.label} (one-time)`, valueCents: item.amountCents });
    }
  }

  steps.push({ kind: 'result', label: 'Total due in the first month', valueCents: cost.firstMonthCents });

  const feeRange = TYPICAL_FEE_RANGES.find((r) => r.id === 'community_fee');

  return {
    id: 'first-month',
    title: 'Why the first month costs more than the rest',
    question: 'How is the first month’s total worked out?',
    plainLanguage:
      'Move-in costs land once, at the start, and they are usually non-refundable even if the stay turns out to be short. Families who budget from the monthly figure alone meet this bill unprepared.',
    formula:
      'first month = all-in monthly cost + community fee + any entry fee + any other one-time costs',
    steps,
    assumptions: [
      'One-time costs are charged in month one and never again. Any deposit that is refundable should be entered as zero here and tracked separately.',
    ],
    sources: feeRange
      ? [
          `Community and move-in fees typically run ${formatCents(feeRange.lowCents)}–${formatCents(
            feeRange.highCents,
          )}. ${FEE_RANGE_SOURCE.description}`,
        ]
      : [],
    caveats: [
      'Whether a community fee is refundable, and for how long, is a contract term worth getting in writing before signing.',
      'An entry fee shown here is the amount paid on moving in. How much of it comes back, and after how long, depends on the contract\u2019s refund schedule \u2014 that is a separate figure and is not netted off this total.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 4. The monthly gap after income                                     */
/* ------------------------------------------------------------------ */

function explainMonthlyGap(
  plan: Plan,
  input: RunwayInput,
  cost: CostBreakdown,
  runway: RunwayResult,
): Explanation {
  const monthOneIncome = plan.income.reduce((sum, s) => sum + incomeAtMonth(s, 1), 0);

  const steps: ExplainStep[] = [
    { kind: 'add', label: 'Realistic all-in cost for the month', valueCents: cost.allInMonthlyCents },
  ];

  // A care-level increase dated to month one is already inside the engine's
  // month-one figure, so it has to appear here too or the parts stop adding up.
  const earlyTierBump =
    input.careLevelIncrease && input.careLevelIncrease.atMonth <= 1
      ? input.careLevelIncrease.cents
      : 0;
  if (earlyTierBump > 0) {
    steps.push({
      kind: 'add',
      label: 'Care-level increase, already in effect',
      valueCents: earlyTierBump,
    });
  }

  for (const source of plan.income) {
    steps.push({
      kind: 'subtract',
      label: `Income: ${source.label}`,
      valueCents: incomeAtMonth(source, 1),
      workingOut:
        source.eliminationPeriodDays > 0
          ? `Pays nothing for the first ${source.eliminationPeriodDays} days`
          : undefined,
    });
  }

  if (plan.income.length === 0) {
    steps.push({ kind: 'note', label: 'No regular income has been entered.' });
  }

  // The gap is floored at zero. Where income covers the cost, that clamp is
  // shown as a step rather than left as an unexplained discrepancy between the
  // parts and the total.
  const rawGap = cost.allInMonthlyCents + earlyTierBump - monthOneIncome;
  if (rawGap < runway.monthlyShortfallCents) {
    steps.push({
      kind: 'add',
      label: 'Income is more than the cost, so the gap is held at zero rather than going negative',
      valueCents: runway.monthlyShortfallCents - rawGap,
    });
  }

  steps.push({
    kind: 'result',
    label: 'Gap to be funded each month',
    valueCents: runway.monthlyShortfallCents,
  });

  return {
    id: 'monthly-gap',
    title: 'How the monthly gap is worked out',
    question: 'How is the monthly gap after income worked out?',
    plainLanguage:
      'This is the amount that has to come from somewhere other than the care recipient’s own regular income each month — from savings first, and from the family once savings are gone. It is the number the rest of the plan turns on.',
    formula: 'monthly gap = all-in monthly cost − regular monthly income (never less than zero)',
    steps,
    assumptions: [
      `Income is assumed to rise ${formatPercent(
        plan.income[0]?.colaRate ?? 0,
        1,
      )} a year, applied at each year boundary rather than monthly.`,
      'One-time move-in costs are excluded from this figure so it represents an ordinary month.',
      'Public benefits are not counted as income unless they have been entered as an income source.',
    ],
    sources: [],
    caveats: [
      'Medicare pays nothing toward long-term custodial care in assisted living or a nursing home. It is not counted here, and assuming otherwise is the most expensive misconception in this decision.',
      'Medicaid eligibility is deliberately not modelled. Where it applies it changes this figure substantially, and getting state spend-down rules subtly wrong causes real harm.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 5. The runway                                                       */
/* ------------------------------------------------------------------ */

function explainRunway(
  plan: Plan,
  input: RunwayInput,
  runway: RunwayResult,
  sensitivity: SensitivityResult,
): Explanation {
  const liquid = input.assets.filter((a) => a.liquid);
  const excluded = input.assets.filter((a) => !a.liquid);
  const startingAssets = liquid.reduce((sum, a) => sum + a.balanceCents, 0);
  const years = runway.yearlyBreakdown;
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  const steps: ExplainStep[] = [
    { kind: 'reference', label: 'Savings available at the start', valueCents: startingAssets },
    {
      kind: 'reference',
      label: 'Gap in month one, before one-time costs',
      valueCents: runway.monthlyShortfallCents,
    },
    {
      kind: 'note',
      label:
        'Each month, the gap between cost and income is taken out of savings. Whatever is left earns the assumed return for that month — one twelfth of the annual rate — and the next month starts from there. The months are simulated one at a time rather than divided, because the things that actually end a plan early only appear when time is modelled: an increase that compounds, a move up the care levels, an insurance benefit period running out.',
    },
    {
      kind: 'note',
      label: `At each year boundary the care cost is multiplied by 1 + ${formatPercent(
        input.annualEscalatorRate,
        1,
      )}, and everyday costs by 1 + ${formatPercent(
        input.generalInflationRate,
        1,
      )}. Income rises separately, at its own assumed rate.`,
    },
  ];

  if (firstYear) {
    steps.push({
      kind: 'reference',
      label: 'Paid for care and everyday costs in year 1',
      valueCents: firstYear.careCostCents,
    });
  }
  if (lastYear && years.length > 1) {
    steps.push({
      kind: 'reference',
      label: `Paid for the same care in year ${lastYear.year}, after ${lastYear.year - 1} annual increases`,
      valueCents: lastYear.careCostCents,
    });
  }

  steps.push({
    kind: 'reference',
    label: `Total funded from savings and family over ${runway.projectionMonths / MONTHS_PER_YEAR} years`,
    valueCents: runway.totalOutOfPocketCents,
  });

  steps.push({
    kind: 'result',
    label:
      runway.depletionMonth === null
        ? 'Savings are not projected to run out within the horizon'
        : 'Savings are projected to run out in',
    valueText:
      runway.depletionMonth === null
        ? `not within ${runway.projectionMonths / MONTHS_PER_YEAR} years`
        : `month ${runway.depletionMonth} (${formatMonths(runway.depletionMonth)})`,
  });

  steps.push({
    kind: 'note',
    label: `The headline is shown as a range — ${formatRunwayBand(
      sensitivity.bandLowMonths,
      sensitivity.bandHighMonths,
    )} — rather than as that single month. The range is the shortest and longest runway produced by re-running this same projection with each assumption moved to the low and high end of its plausible band, one at a time.`,
  });

  if (runway.contributorBurdenStartMonth !== null) {
    steps.push({
      kind: 'note',
      label: `From month ${runway.contributorBurdenStartMonth}, savings no longer cover the gap and the family funds care directly.`,
    });
  }
  if (runway.borrowingStartMonth !== null) {
    steps.push({
      kind: 'note',
      label: `From month ${runway.borrowingStartMonth}, the amount needed is larger than the combined monthly amount the family recorded as affordable. Past that point the plan requires borrowing.`,
    });
  }

  const assumptions = [
    `Care costs rise ${formatPercent(input.annualEscalatorRate, 1)} a year, compounding.`,
    `Everyday costs rise ${formatPercent(input.generalInflationRate, 1)} a year.`,
    `Income rises ${formatPercent(plan.income[0]?.colaRate ?? 0, 1)} a year.`,
    `Savings earn ${formatPercent(liquid[0]?.annualReturnRate ?? 0, 1)} a year, credited monthly.`,
    `The projection runs ${plan.assumptions.projectionYears} years and then stops.`,
    'Savings are spent in a fixed order: cash first, then brokerage, then retirement accounts, then anything else.',
  ];
  if (excluded.length > 0) {
    assumptions.push(
      'Home equity is excluded from the money available. Selling a home is a decision for the family to make, not an assumption a planner gets to make for them.',
    );
  }

  return {
    id: 'runway',
    title: 'How long the money lasts, month by month',
    question: 'How is the length of time the savings last worked out?',
    plainLanguage:
      'This is a month-by-month simulation, not a division. Starting from the savings available, each month subtracts that month’s gap between cost and income, grows what remains by the assumed return, raises the cost at each year boundary, and repeats. The month savings reach zero is the runway.',
    formula:
      'for each month: savings = savings × (1 + return ÷ 12) − max(0, care cost + everyday costs − income); the runway is the first month savings reach zero',
    steps,
    assumptions,
    sources: [
      'The projection uses the figures entered on this page. No external data is fetched, and nothing typed here is sent anywhere.',
    ],
    caveats: [
      'Nobody knows how long care will be needed. A runway is a budgeting horizon, not a prediction about a person.',
      'Investment returns are assumed to be steady. Real returns are not, and a poor sequence of returns early on shortens the runway more than the same average return arriving later.',
      'Medicaid, VA benefits and long-term care insurance are only included if they have been entered as income. Where Medicaid applies, it changes this projection fundamentally.',
      'A change in care level is not assumed. If one is expected, entering it moves this figure substantially — as the sensitivity ranking shows.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 6. The home-versus-facility crossover                               */
/* ------------------------------------------------------------------ */

function explainBreakEven(
  result: BreakEvenResult,
  hourlyRateCents: number,
  hoursPerWeek: number,
): Explanation {
  const costOfOneHourPerWeek = Math.round((hourlyRateCents * WEEKS_PER_YEAR) / MONTHS_PER_YEAR);

  const steps: ExplainStep[] = [
    {
      kind: 'reference',
      label: 'Residential care, all-in each month',
      workingOut: 'Room, board and care together',
      valueCents: result.residentialMonthlyCents,
    },
    {
      kind: 'reference',
      label: 'Cost of keeping the home running each month',
      workingOut: 'Mortgage or rent, utilities, taxes, insurance, food, upkeep, transport',
      valueCents: result.inHomeFixedMonthlyCents,
    },
    {
      kind: 'reference',
      label: 'Paid help: one hour a week, for a month',
      workingOut: `${formatCentsPrecise(hourlyRateCents)} × ${WEEKS_PER_YEAR} weeks ÷ ${MONTHS_PER_YEAR} months`,
      valueCents: costOfOneHourPerWeek,
    },
  ];

  if (result.residentialAlwaysCheaper) {
    steps.push({
      kind: 'note',
      label:
        'The cost of running the home already exceeds the residential rate, so residential care is cheaper before a single hour of paid help is bought. The crossover is reported as zero rather than as a negative number of hours.',
    });
  } else {
    steps.push({
      kind: 'note',
      label: `Crossover = (${formatCents(result.residentialMonthlyCents)} − ${formatCents(
        result.inHomeFixedMonthlyCents,
      )}) ÷ ${formatCents(costOfOneHourPerWeek)} per hour a week.`,
    });
  }

  steps.push({
    kind: 'result',
    label: 'The two options cost the same at',
    valueText: Number.isFinite(result.breakEvenHoursPerWeek)
      ? `${Math.round(result.breakEvenHoursPerWeek * 10) / 10} hours a week of paid help`
      : 'no crossover, because the hourly rate is zero',
  });

  steps.push({
    kind: 'reference',
    label: `Care at home at ${hoursPerWeek} hours a week, fully loaded`,
    workingOut: 'Home running costs plus paid hours',
    valueCents: result.inHomeMonthlyCents,
  });
  steps.push({
    kind: 'reference',
    label: 'Residential care, for comparison',
    valueCents: result.residentialMonthlyCents,
  });
  steps.push({
    kind: 'note',
    label:
      result.cheaperOption === 'equal'
        ? 'At the hours entered, the two options cost about the same.'
        : `At the hours entered, ${
            result.cheaperOption === 'in_home' ? 'care at home' : 'residential care'
          } is cheaper by ${formatCents(result.monthlyDifferenceCents)} a month.`,
  });

  return {
    id: 'break-even',
    title: 'How the home-or-facility crossover is found',
    question: 'How is the crossover between home care and residential care worked out?',
    plainLanguage:
      'Paid help at home is cheaper up to a point, because it is bought by the hour. Residential care is a flat rate that already includes room and board. Somewhere between the two there is a number of paid hours a week at which they cost the same, and it is found by asking how many hours the difference will buy.',
    formula:
      'crossover hours a week = (residential all-in cost − cost of running the home) ÷ (hourly rate × 52 ÷ 12)',
    steps,
    assumptions: [
      'Staying at home does not stop the mortgage, the utilities or the groceries. Those are counted on the home side, because residential care already includes them. Leaving them at zero flatters staying at home, often by thousands a month.',
      'Paid help is assumed to be bought at a single hourly rate. Overnight, weekend and live-in cover are commonly charged at different rates.',
    ],
    sources: [
      `Hourly rate: ${COST_DATA_SOURCE.name}, ${COST_DATA_SOURCE.surveyYear} survey, published median for non-medical care at home.`,
    ],
    caveats: [
      'This compares cost and nothing else. Safety, supervision through the night, and isolation are not modelled here, and they frequently matter more than the money.',
      'Unpaid family hours are not priced into the home side. Where a family member is providing the care, the cost has moved onto them rather than disappeared.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 7. The split                                                        */
/* ------------------------------------------------------------------ */

const SPLIT_METHOD_FORMULA: Record<SplitMethod, string> = {
  equal: 'each share = gap ÷ number of family members sharing',
  income_proportional: 'each share = gap × (that person’s income ÷ total income)',
  custom: 'each share = the amount that person has offered',
};

function explainSplit(
  split: SplitResult,
  contributors: readonly Contributor[],
  shortfallCents: number,
): Explanation {
  const totalIncome = contributors.reduce((sum, c) => sum + (c.annualIncomeCents ?? 0), 0);
  const effectiveMethod: SplitMethod = split.fellBackToEqual ? 'equal' : split.method;

  const steps: ExplainStep[] = [
    { kind: 'reference', label: 'Gap to be shared each month', valueCents: shortfallCents },
    {
      kind: 'reference',
      label: 'Family members sharing it',
      valueText: `${split.shares.length}`,
    },
  ];

  split.shares.forEach((share, i) => {
    const contributor = contributors[i];
    let workingOut: string | undefined;
    if (effectiveMethod === 'equal') {
      workingOut = `${formatCentsPrecise(shortfallCents)} ÷ ${split.shares.length}`;
    } else if (effectiveMethod === 'income_proportional' && totalIncome > 0) {
      workingOut = `${formatCentsPrecise(shortfallCents)} × ${formatCents(
        contributor?.annualIncomeCents ?? 0,
      )} ÷ ${formatCents(totalIncome)}`;
    } else if (effectiveMethod === 'custom') {
      workingOut = 'The amount offered';
    }
    steps.push({ kind: 'add', label: share.name, workingOut, valueCents: share.monthlyCents });
  });

  steps.push({
    kind: 'result',
    label: 'Total of the shares',
    valueCents: split.totalCents,
  });

  const notes: ExplainStep[] = [
    {
      kind: 'note',
      label:
        'Shares are shown to the cent on purpose. Dividing a gap between people almost never comes out in whole dollars, and the leftover cents are handed to the largest fractions in turn — the largest-remainder method — so the parts add up to exactly the gap rather than to a dollar either side of it.',
    },
  ];

  if (split.fellBackToEqual) {
    notes.push({
      kind: 'note',
      label:
        'A split in proportion to income was selected, but income is missing for at least one person, so these figures use an equal split instead. Falling back quietly would misrepresent the basis of numbers a family is about to discuss.',
    });
  }
  if (split.unfundedCents > 0) {
    notes.push({
      kind: 'note',
      label: `The amounts offered are ${formatCents(
        split.unfundedCents,
      )} a month short of the gap. That remainder is not assigned to anyone.`,
    });
  }
  if (split.anyExceedsCapacity) {
    notes.push({
      kind: 'note',
      label:
        'At least one share is larger than the amount that person recorded as affordable. A share above capacity is funded by borrowing, which is how supporting a parent turns into debt.',
    });
  }

  return {
    id: 'split',
    title: 'How each share is worked out',
    question: 'How is each family member’s share worked out?',
    plainLanguage:
      'This divides the monthly gap between the people sharing it, by the method selected. The arithmetic is not difficult; the point is that the figures come from the plan rather than from whoever raised the subject.',
    formula: SPLIT_METHOD_FORMULA[effectiveMethod],
    steps: [...steps, ...notes],
    assumptions: [
      'The gap divided here is the ordinary monthly one. One-time move-in costs are not included.',
      'The gap is shared as it stands today. It grows as care costs rise, and it grows again once savings run out.',
    ],
    sources: [
      `Unpaid care hours are valued at the published median hourly rate for care at home (${COST_DATA_SOURCE.name}, ${COST_DATA_SOURCE.surveyYear}).`,
    ],
    caveats: [
      'Unpaid care hours and task ownership are shown beside the cash shares and deliberately not subtracted from them. How to weigh someone’s time against someone else’s money is a decision for the family, and an app that quietly did the netting would be taking a side.',
      'Nothing here accounts for what anyone has already paid, or for gifts and loans between family members.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 8. The contribution ledger                                          */
/* ------------------------------------------------------------------ */

function explainLedger(summary: LedgerSummary, monthsElapsed: number): Explanation {
  const steps: ExplainStep[] = [
    {
      kind: 'reference',
      label: 'Months of care paid for so far',
      valueText: monthsElapsed === 1 ? '1 month' : `${monthsElapsed} months`,
    },
    {
      kind: 'reference',
      label: 'Entries logged',
      valueText: summary.entryCount === 1 ? '1 entry' : `${summary.entryCount} entries`,
    },
  ];

  for (const row of summary.reconciliation) {
    steps.push({
      kind: 'add',
      label: `Paid by ${row.name}`,
      workingOut: 'Every entry logged against this person, added up',
      valueCents: row.paidTotalCents,
    });
  }

  // Reducing the number of people sharing the cost leaves entries attached to
  // someone no longer listed. Those payments were still made, so they are shown
  // rather than quietly dropped — and without this row the total would not add
  // up, which is worse than the awkwardness of naming the situation.
  const attributed = summary.reconciliation.reduce((sum, r) => sum + r.paidTotalCents, 0);
  const unattributed = summary.totalPaidCents - attributed;
  if (unattributed !== 0) {
    steps.push({
      kind: 'add',
      label: 'Paid by someone no longer listed as sharing the cost',
      workingOut: 'Entries kept rather than deleted when the list of people changed',
      valueCents: unattributed,
    });
  }

  steps.push({
    kind: 'result',
    label: 'Total logged as paid',
    valueCents: summary.totalPaidCents,
  });

  // The reconciliation is a second calculation on top of that total, so it is
  // written out per person rather than folded into the column above.
  for (const row of summary.reconciliation) {
    const state =
      row.balanceCents === 0
        ? 'exactly level with the plan'
        : row.balanceCents > 0
          ? `${formatCentsPrecise(row.balanceCents)} ahead of the plan`
          : `${formatCentsPrecise(Math.abs(row.balanceCents))} behind the plan`;
    steps.push({
      kind: 'note',
      label: `${row.name}: a share of ${formatCentsPrecise(
        row.pledgedMonthlyCents,
      )} a month × ${monthsElapsed} ${monthsElapsed === 1 ? 'month' : 'months'} = ${formatCentsPrecise(
        row.expectedToDateCents,
      )} expected. ${formatCentsPrecise(row.paidTotalCents)} has been logged, which is ${state}.`,
    });
  }

  const categoryLines = Object.entries(summary.byCategory)
    .filter(([, cents]) => cents > 0)
    .map(
      ([category, cents]) =>
        `${EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ?? category} ${formatCentsPrecise(cents)}`,
    );
  if (categoryLines.length > 0) {
    steps.push({
      kind: 'note',
      label: `By category: ${categoryLines.join('; ')}.`,
    });
  }

  if (summary.deductibleCandidateCents > 0) {
    steps.push({
      kind: 'note',
      label: `${formatCentsPrecise(
        summary.deductibleCandidateCents,
      )} of that is marked as possibly counting toward unreimbursed medical expenses. That is a total of what was ticked, not a determination that any of it is deductible.`,
    });
  }

  return {
    id: 'ledger',
    title: 'How the contribution ledger reconciles',
    question: 'How is what each family member has actually paid reconciled?',
    plainLanguage:
      'A split that stays theoretical settles nothing. This adds up what has actually been paid, by whom, and sets it against what the agreed share would have come to over the same period. The gap between the two is the thing a family is usually arguing about without having written it down.',
    formula:
      'total paid = every entry added up; expected of a person = their monthly share × months elapsed; balance = what they paid − what was expected',
    steps,
    assumptions: [
      'The number of months is entered by the family rather than taken from today’s date, so the same plan reopened later shows the same figures until someone changes it.',
      'Each person’s expected amount uses their share as it stands now, applied evenly across every month elapsed. A share that changed partway through is not modelled.',
      'Only what has been entered is counted. An unlogged payment is invisible here, which is the ledger’s main weakness and the reason to log as it happens.',
    ],
    sources: [
      'Every figure in this table was entered by the family. Nothing here comes from a published dataset.',
    ],
    caveats: [
      'Unpaid care hours and task ownership are not in these totals. They are contributions, and they are shown beside the cash shares in the sharing section — but converting someone’s time into a cash credit is a family decision, not one this app makes.',
      'A balance is not a verdict. Someone behind on cash may be the person doing the driving, the calls and the paperwork.',
      'The medical-expense total is a starting point for a conversation with a tax professional. Whether any of it is deductible depends on income, on itemising, and on whether care follows a plan of care — none of which this app models.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 9. The sensitivity ranking                                          */
/* ------------------------------------------------------------------ */

function explainSensitivity(sensitivity: SensitivityResult): Explanation {
  const tierRange = TYPICAL_FEE_RANGES.find((r) => r.id === 'care_level_tier');

  const steps: ExplainStep[] = sensitivity.levers.map((lever) => ({
    kind: 'reference' as const,
    label: lever.label,
    workingOut: lever.description,
    valueText:
      lever.impactMonths === 0
        ? 'no effect on this plan'
        : `${formatMonths(lever.impactMonths)} of difference`,
  }));

  steps.push({
    kind: 'result',
    label: 'The assumption that moves the answer most',
    valueText: sensitivity.topLever
      ? sensitivity.topLever.label
      : 'none of them changes this plan',
  });

  return {
    id: 'sensitivity',
    title: 'How the ranking of assumptions is produced',
    question: 'How is the ranking of what would change this answer worked out?',
    plainLanguage:
      'Each assumption is moved to the low end and then the high end of its plausible range, one at a time, with everything else held still. The whole projection is re-run both times, and the gap between the two runway figures is how much that assumption is worth. Ranking them shows where accuracy is worth chasing — and, just as usefully, where it is not.',
    formula:
      'impact of an assumption = |runway with it at its low bound − runway with it at its high bound|, everything else unchanged',
    steps,
    assumptions: [
      `Annual rate increases are moved between ${formatPercent(
        ANNUAL_ESCALATOR_BAND.low,
      )} and ${formatPercent(ANNUAL_ESCALATOR_BAND.high)} — a published range, not an invented one.`,
      tierRange
        ? `A move up the care levels is tested as ${formatCents(
            tierRange.highCents,
          )} a month arriving in year two, the top of the typical tier range.`
        : '',
      `Investment returns are moved between ${formatPercent(
        PLANNING_BANDS.assetReturnRate.low,
      )} and ${formatPercent(PLANNING_BANDS.assetReturnRate.high)}; income increases between ${formatPercent(
        PLANNING_BANDS.incomeColaRate.low,
      )} and ${formatPercent(PLANNING_BANDS.incomeColaRate.high)}. These two are planning assumptions rather than survey data, and are labelled as such in the table.`,
      `Everyday costs are moved ${formatPercent(
        PLANNING_BANDS.ancillarySwing,
      )} either side of the figure entered.`,
      'Where a plan never runs out of money within the horizon, the runway is treated as one month past the end so the comparison stays a number rather than collapsing.',
    ].filter(Boolean),
    sources: [
      `Published bands: ${COST_DATA_SOURCE.name}, ${COST_DATA_SOURCE.surveyYear}, and typical fee ranges. ${FEE_RANGE_SOURCE.description}`,
    ],
    caveats: [
      'Assumptions are moved one at a time. Several going wrong together would be worse than any single figure here suggests.',
      'A low ranking means an assumption barely matters for this plan as entered. It does not mean it never matters.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 10. How a community's overall score is reached                      */
/* ------------------------------------------------------------------ */

/**
 * The facility composite (spec §11.2.2).
 *
 * Unlike every other derivation here this one is not money, and it is not a sum
 * — it is a weighted mean, so its parts add to a *points total* which is then
 * divided by the total weight. It therefore follows the `sensitivity` pattern:
 * `reference` steps carrying `valueText`, and a `valueText` result. There are
 * no cents-typed `add`/`subtract` steps, so `isBalanced` holds vacuously and
 * correctly rather than by dressing scores up as currency. The real check —
 * that the products sum to the stated total and that the total over the stated
 * weight equals the composite — is asserted in `fit.test.ts` on engine output
 * and in `e2e/facilities.spec.ts` on the rendered strings (spec §11.2.5).
 *
 * The caveats do the most important work in this panel. Everything above them
 * is arithmetic on eight subjective judgements, and the panel has to say so.
 */
function explainFacilityFit(fit: FacilityFit): Explanation {
  const steps: ExplainStep[] = [];

  steps.push({
    kind: 'note',
    label: `How ${fit.label} scored, on the dimensions this family both assessed and said mattered.`,
  });

  for (const part of fit.parts) {
    steps.push({
      kind: 'reference',
      label: part.label,
      workingOut: `scored ${part.score} out of ${MAX_SCORE} × weight ${part.weight} (${WEIGHT_LABELS[part.weight]})`,
      valueText: `${part.weightedPoints} points`,
    });
  }

  if (fit.notWeighted.length > 0) {
    steps.push({
      kind: 'note',
      label: `Left out because this family weighted them "${WEIGHT_LABELS[0]}": ${dimensionLabels(
        fit.notWeighted,
      )}. They were assessed; they are not counted.`,
    });
  }

  if (fit.unrated.length > 0) {
    steps.push({
      kind: 'note',
      label: `Left out because no score was recorded: ${dimensionLabels(
        fit.unrated,
      )}. An unassessed dimension is not a zero — counting it as one would mark a community down for a question nobody got to ask.`,
    });
  }

  steps.push({
    kind: 'reference',
    label: 'Points in total',
    workingOut: fit.parts.map((p) => `${p.score}×${p.weight}`).join(' + ') || 'nothing counted',
    valueText: `${fit.weightedPointsTotal} points`,
  });
  steps.push({
    kind: 'reference',
    label: 'Weight in total',
    workingOut: fit.parts.map((p) => String(p.weight)).join(' + ') || 'nothing counted',
    valueText: String(fit.weightTotal),
  });
  steps.push({
    kind: 'result',
    label: 'Weighted score',
    workingOut:
      fit.compositeScore === null
        ? undefined
        : `${fit.weightedPointsTotal} ÷ ${fit.weightTotal}`,
    valueText: formatComposite(fit.compositeScore),
  });

  return {
    id: 'facility-fit',
    title: `How the weighted score for ${fit.label} is reached`,
    question: `How is the weighted score for ${fit.label} worked out?`,
    plainLanguage:
      'Each dimension was given a score out of five on the visit, and a weight saying how much it matters to this family. Every score is multiplied by its weight, the results are added together, and the total is divided by the total weight. Weighting is what stops a great dining room outvoting worrying staff for a family who cares more about staff.',
    formula:
      'weighted score = sum of (score × weight) ÷ sum of the weights, over the dimensions that were both scored and weighted above zero',
    steps,
    assumptions: [
      `Scores run from 1 to ${MAX_SCORE} and weights from 0 to ${MAX_WEIGHT}. A dimension with no weight set counts as ${DEFAULT_WEIGHT} ("${WEIGHT_LABELS[DEFAULT_WEIGHT]}").`,
      'Dimensions with no score are excluded from both the points total and the weight total, so a community is compared only on what was actually assessed.',
      'Every community on the shortlist is scored against the same set of weights, which is what makes the scores comparable at all.',
    ],
    sources: [
      'Every score and note here was entered by the family from their own visit. Nothing on this panel is fetched, published, or supplied by any community or referral service — this app has no facility directory and takes no referral revenue (spec §1.1).',
    ],
    caveats: [
      'This is arithmetic on impressions, not a measurement. Two people touring the same community on the same afternoon would score it differently, and neither would be wrong.',
      'A single visit sees one shift on one day. Staffing on a weekday morning is not staffing on a Sunday night, and turnover in the months ahead is not visible from a tour at all.',
      'The score deliberately does not include cost. What a community costs is worked out by the rest of this page, and the two are shown side by side rather than blended — a number that mixed a family’s feeling about the dining room with the price of the apartment could not be argued with sensibly.',
      'No community is named as the best one here. Ranking eight subjective scores would claim an authority this arithmetic has not got.',
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

export interface ExplanationInputs {
  readonly plan: Plan;
  readonly result: ScenarioResult;
  readonly breakEven: BreakEvenResult | null;
  /** Hourly aide rate behind the break-even comparison. */
  readonly breakEvenHourlyRateCents: number;
  readonly breakEvenHoursPerWeek: number;
  readonly split: SplitResult | null;
  readonly contributors: readonly Contributor[];
  /** Reconciled ledger, or null when nothing has been logged yet. */
  readonly ledger: LedgerSummary | null;
  readonly monthsElapsed: number;
  /**
   * The community whose weighted score is currently on screen, or null when the
   * shortlist is empty. Only one derivation is built at a time because only one
   * "?" is open at a time; the panel passes the facility being explained.
   */
  readonly facilityFit: FacilityFit | null;
}

/** Every derivation the results screen can currently show. */
export function buildExplanations(inputs: ExplanationInputs): ExplanationSet {
  const { plan, result, breakEven, split, contributors } = inputs;
  const { scenario, cost, runway, sensitivity } = result;
  const runwayInput = buildRunwayInput(plan, scenario);

  return {
    'base-rate': explainBaseRate(scenario, cost),
    'all-in': explainAllIn(scenario, cost),
    'first-month': explainFirstMonth(scenario, cost),
    'monthly-gap': explainMonthlyGap(plan, runwayInput, cost, runway),
    runway: explainRunway(plan, runwayInput, runway, sensitivity),
    'break-even': breakEven
      ? explainBreakEven(breakEven, inputs.breakEvenHourlyRateCents, inputs.breakEvenHoursPerWeek)
      : null,
    split: split ? explainSplit(split, contributors, runway.monthlyShortfallCents) : null,
    ledger: inputs.ledger ? explainLedger(inputs.ledger, inputs.monthsElapsed) : null,
    sensitivity: explainSensitivity(sensitivity),
    'facility-fit': inputs.facilityFit ? explainFacilityFit(inputs.facilityFit) : null,
  };
}

/** The order the methodology section reads in: cost, then time, then people. */
export const EXPLANATION_ORDER = [
  'base-rate',
  'all-in',
  'first-month',
  'monthly-gap',
  'runway',
  'sensitivity',
  'break-even',
  'split',
  'ledger',
  'facility-fit',
] as const;
