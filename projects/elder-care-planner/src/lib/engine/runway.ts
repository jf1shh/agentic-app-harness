/**
 * Funding & Runway Engine (spec §6.3).
 *
 * The single number families need: how long the money lasts. Simulated month by
 * month rather than divided, because the things that actually end a plan early
 * — a compounding annual escalator, a care-level bump, an insurance benefit
 * period expiring — only show up when time is modelled explicitly.
 *
 * Assets are drawn down in a defined order (cash, then brokerage, then
 * retirement, then everything else) so results are deterministic and a family
 * can follow which pot empties when.
 */
import type { IncomeSource } from '../schemas';

export interface RunwayAsset {
  readonly id: string;
  readonly label: string;
  readonly kind: 'cash' | 'brokerage' | 'retirement' | 'home_equity' | 'other';
  readonly balanceCents: number;
  readonly annualReturnRate: number;
  readonly liquid: boolean;
}

export interface RunwayInput {
  /** All-in care cost in month one, before any escalation. */
  readonly allInMonthlyCents: number;
  /** Community fee and other one-time costs, charged in month one. */
  readonly oneTimeCents: number;
  /** Annual rate escalator applied to the care cost at each year boundary. */
  readonly annualEscalatorRate: number;
  /** Recurring non-care spend, inflated at the general rate. */
  readonly ancillaryMonthlyCents: number;
  readonly generalInflationRate: number;
  /** A planned or feared move up the care-level tiers. */
  readonly careLevelIncrease?: { readonly atMonth: number; readonly cents: number };
  readonly income: readonly IncomeSource[];
  readonly assets: readonly RunwayAsset[];
  readonly projectionYears: number;
  /** Combined monthly amount contributors say they can afford. */
  readonly contributorCapacityCents?: number;
}

/**
 * One month of the simulation. The yearly rows are this series sampled at
 * year boundaries — not a second accumulation — so a chart drawn from
 * `monthlyBreakdown` and a table drawn from `yearlyBreakdown` can never
 * disagree about the same instant (§6 lesson "Explain the Arithmetic Without
 * Re-implementing It").
 */
export interface RunwayMonth {
  readonly month: number;
  readonly careCostCents: number;
  readonly incomeCents: number;
  readonly shortfallCents: number;
  readonly assetsEndCents: number;
}

export interface RunwayYear {
  readonly year: number;
  readonly careCostCents: number;
  readonly incomeCents: number;
  readonly shortfallCents: number;
  readonly assetsEndCents: number;
}

export interface RunwayResult {
  /** Month liquid assets run out. Null means income covers the cost throughout. */
  readonly depletionMonth: number | null;
  /** Month contributors start funding care from their own pockets. */
  readonly contributorBurdenStartMonth: number | null;
  /** Month the required contribution exceeds what contributors said they can afford. */
  readonly borrowingStartMonth: number | null;
  readonly yearlyBreakdown: readonly RunwayYear[];
  /** Every month of the projection, for depletion curves. */
  readonly monthlyBreakdown: readonly RunwayMonth[];
  /** Month-one gap between cost and income, excluding one-time fees. */
  readonly monthlyShortfallCents: number;
  /** Month one including the community fee and other one-time costs. */
  readonly firstMonthTotalCents: number;
  /** Everything paid out of assets and contributions across the projection. */
  readonly totalOutOfPocketCents: number;
  readonly projectionMonths: number;
}

const DRAWDOWN_ORDER: readonly RunwayAsset['kind'][] = [
  'cash',
  'brokerage',
  'retirement',
  'other',
  'home_equity',
];

/** Months of elimination period, rounded up — insurers pay nothing until it elapses. */
function eliminationMonths(source: IncomeSource): number {
  return Math.ceil(source.eliminationPeriodDays / 30);
}

/** Income from one source in a given 1-based month, or zero if not yet/no longer paying. */
export function incomeAtMonth(source: IncomeSource, month: number): number {
  const startsAfter = eliminationMonths(source);
  if (month <= startsAfter) return 0;

  if (source.endsAfterMonths !== undefined) {
    const monthsPaid = month - startsAfter;
    if (monthsPaid > source.endsAfterMonths) return 0;
  }

  const yearIndex = Math.floor((month - 1) / 12);
  return Math.round(source.monthlyCents * Math.pow(1 + source.colaRate, yearIndex));
}

export function computeRunway(input: RunwayInput): RunwayResult {
  const projectionMonths = input.projectionYears * 12;

  // Only liquid assets fund care. Home equity is excluded unless the family has
  // explicitly marked it liquid, because "sell the house" is a decision, not an
  // assumption a planner gets to make on their behalf.
  const pots = input.assets
    .filter((a) => a.liquid)
    .slice()
    .sort(
      (a, b) => DRAWDOWN_ORDER.indexOf(a.kind) - DRAWDOWN_ORDER.indexOf(b.kind),
    )
    .map((a) => ({ ...a, balance: a.balanceCents }));

  let depletionMonth: number | null = null;
  let contributorBurdenStartMonth: number | null = null;
  let borrowingStartMonth: number | null = null;
  let totalOutOfPocket = 0;
  let monthlyShortfallCents = 0;
  let firstMonthTotalCents = 0;

  const yearly: RunwayYear[] = [];
  const monthly: RunwayMonth[] = [];
  let yearCare = 0;
  let yearIncome = 0;
  let yearShortfall = 0;

  for (let month = 1; month <= projectionMonths; month += 1) {
    const yearIndex = Math.floor((month - 1) / 12);

    const tierBump =
      input.careLevelIncrease && month >= input.careLevelIncrease.atMonth
        ? input.careLevelIncrease.cents
        : 0;

    const careCost = Math.round(
      (input.allInMonthlyCents + tierBump) *
        Math.pow(1 + input.annualEscalatorRate, yearIndex),
    );
    const ancillary = Math.round(
      input.ancillaryMonthlyCents * Math.pow(1 + input.generalInflationRate, yearIndex),
    );
    const oneTime = month === 1 ? input.oneTimeCents : 0;

    const monthCost = careCost + ancillary + oneTime;
    const monthIncome = input.income.reduce((sum, s) => sum + incomeAtMonth(s, month), 0);
    const shortfall = Math.max(0, monthCost - monthIncome);

    if (month === 1) {
      monthlyShortfallCents = Math.max(0, careCost + ancillary - monthIncome);
      firstMonthTotalCents = monthCost;
    }

    // Grow the pots, then draw this month's shortfall from them in order.
    let remaining = shortfall;
    for (const pot of pots) {
      pot.balance = pot.balance * (1 + pot.annualReturnRate / 12);
      if (remaining <= 0) continue;
      const drawn = Math.min(pot.balance, remaining);
      pot.balance -= drawn;
      remaining -= drawn;
    }

    if (remaining > 0) {
      // Assets could not cover the gap: from here the family pays directly.
      if (depletionMonth === null) depletionMonth = month;
      if (contributorBurdenStartMonth === null) contributorBurdenStartMonth = month;
      if (
        borrowingStartMonth === null &&
        input.contributorCapacityCents !== undefined &&
        remaining > input.contributorCapacityCents
      ) {
        borrowingStartMonth = month;
      }
    }

    // Read the pots once and reuse it for both series, so the year-boundary
    // month and its yearly row are the same number by construction.
    const assetsEndCents = Math.round(pots.reduce((sum, p) => sum + p.balance, 0));
    monthly.push({
      month,
      careCostCents: Math.round(monthCost),
      incomeCents: Math.round(monthIncome),
      shortfallCents: Math.round(shortfall),
      assetsEndCents,
    });

    totalOutOfPocket += shortfall;
    yearCare += careCost + ancillary + oneTime;
    yearIncome += monthIncome;
    yearShortfall += shortfall;

    if (month % 12 === 0 || month === projectionMonths) {
      yearly.push({
        year: yearIndex + 1,
        careCostCents: Math.round(yearCare),
        incomeCents: Math.round(yearIncome),
        shortfallCents: Math.round(yearShortfall),
        assetsEndCents,
      });
      yearCare = 0;
      yearIncome = 0;
      yearShortfall = 0;
    }
  }

  return {
    depletionMonth,
    contributorBurdenStartMonth,
    borrowingStartMonth,
    yearlyBreakdown: yearly,
    monthlyBreakdown: monthly,
    monthlyShortfallCents,
    firstMonthTotalCents,
    totalOutOfPocketCents: Math.round(totalOutOfPocket),
    projectionMonths,
  };
}
