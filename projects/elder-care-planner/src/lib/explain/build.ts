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
import type { Plan, CareScenario, Contributor, SplitMethod } from '../schemas';
import type { CostBreakdown } from '../engine/cost';
import type { RunwayInput, RunwayResult } from '../engine/runway';
import type { SensitivityResult } from '../engine/sensitivity';
import type { BreakEvenResult } from '../engine/breakeven';
import type { SplitResult } from '../engine/split';
import type { ScenarioResult } from '../engine/plan';
import { buildRunwayInput } from '../engine/plan';
import { incomeAtMonth } from '../engine/runway';
import { ADULT_DAY_FULL_TIME_DAYS_PER_MONTH } from '../engine/cost';
import { PLANNING_BANDS } from '../engine/sensitivity';
import {
  CARE_TYPE_LABELS,
  COST_DATA_SOURCE,
  SURVEY_HOURS_PER_WEEK,
  resolveCost,
} from '../data/costOfCare';
import { ANNUAL_ESCALATOR_BAND, FEE_RANGE_SOURCE, TYPICAL_FEE_RANGES } from '../data/feeStructures';
import { formatCents, formatCentsPrecise, formatMonths, formatPercent, formatRunwayBand } from '../format';
import type { Explanation, ExplainStep, ExplanationSet } from './types';

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

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
    formula: 'first month = all-in monthly cost + community fee + any other one-time costs',
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
/* 8. The sensitivity ranking                                          */
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
    sensitivity: explainSensitivity(sensitivity),
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
] as const;
