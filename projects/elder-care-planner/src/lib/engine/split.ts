/**
 * Family Cost-Sharing Split (spec §6.6).
 *
 * Money is the leading source of sibling conflict in caregiving. The value of
 * this engine is not arithmetic difficulty — it is that the numbers come from
 * the app rather than from whichever sibling raised the subject.
 *
 * Rounding uses the largest-remainder method so the parts always sum to exactly
 * the shortfall. A split that loses a cent is precisely what a family notices.
 */
import type { Contributor, SplitMethod } from '../schemas';

export interface ContributorShare {
  readonly contributorId: string;
  readonly name: string;
  readonly monthlyCents: number;
  /** Unpaid care hours, valued at the local aide rate, shown alongside cash. */
  readonly unpaidHoursPerWeek: number;
  readonly unpaidHoursValueCents: number;
  readonly ownsTaskCount: number;
  /** True when this share exceeds what the contributor said they can afford. */
  readonly exceedsCapacity: boolean;
}

export interface SplitResult {
  readonly method: SplitMethod;
  readonly shares: readonly ContributorShare[];
  readonly totalCents: number;
  /** Custom pledges that fall short of the shortfall leave a gap. */
  readonly unfundedCents: number;
  /** True when income-proportional was requested but income data was missing. */
  readonly fellBackToEqual: boolean;
  readonly anyExceedsCapacity: boolean;
}

/**
 * Distribute an integer amount across weights so the parts sum exactly to the
 * total. Largest remainder: floor everything, then hand the leftover cents to
 * the largest fractional remainders.
 */
export function distributeCents(
  totalCents: number,
  weights: readonly number[],
): number[] {
  const n = weights.length;
  if (n === 0) return [];

  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    // No usable weights: split as evenly as integers allow.
    const base = Math.floor(totalCents / n);
    const out = new Array<number>(n).fill(base);
    let leftover = totalCents - base * n;
    for (let i = 0; leftover > 0; i = (i + 1) % n, leftover -= 1) out[i] += 1;
    return out;
  }

  const exact = weights.map((w) => (totalCents * w) / weightSum);
  const floored = exact.map((v) => Math.floor(v));
  let leftover = totalCents - floored.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    // Ties broken by index so the result is deterministic.
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; leftover > 0; k += 1, leftover -= 1) {
    floored[order[k % n].i] += 1;
  }
  return floored;
}

export interface SplitInput {
  readonly shortfallCents: number;
  readonly contributors: readonly Contributor[];
  readonly method: SplitMethod;
  /** Local hourly aide rate, used to value unpaid care hours. */
  readonly aideHourlyRateCents: number;
}

const WEEKS_PER_MONTH = 52 / 12;

export function computeSplit(input: SplitInput): SplitResult {
  const { contributors, shortfallCents, method, aideHourlyRateCents } = input;

  if (contributors.length === 0) {
    return {
      method,
      shares: [],
      totalCents: 0,
      unfundedCents: shortfallCents,
      fellBackToEqual: false,
      anyExceedsCapacity: false,
    };
  }

  let amounts: number[];
  let fellBackToEqual = false;
  let unfunded = 0;

  if (method === 'custom') {
    amounts = contributors.map((c) => c.monthlyPledgeCents ?? 0);
    const pledged = amounts.reduce((a, b) => a + b, 0);
    unfunded = Math.max(0, shortfallCents - pledged);
  } else if (method === 'income_proportional') {
    const haveAllIncomes = contributors.every(
      (c) => c.annualIncomeCents !== undefined && c.annualIncomeCents > 0,
    );
    if (haveAllIncomes) {
      amounts = distributeCents(
        shortfallCents,
        contributors.map((c) => c.annualIncomeCents as number),
      );
    } else {
      // Falling back silently would misrepresent the basis of the numbers a
      // family is about to argue over, so this is surfaced in the result.
      fellBackToEqual = true;
      amounts = distributeCents(shortfallCents, contributors.map(() => 1));
    }
  } else {
    amounts = distributeCents(shortfallCents, contributors.map(() => 1));
  }

  const shares: ContributorShare[] = contributors.map((c, i) => {
    const unpaidValue = Math.round(
      c.providesUnpaidHoursPerWeek * aideHourlyRateCents * WEEKS_PER_MONTH,
    );
    const exceeds =
      c.monthlyCapacityCents !== undefined && amounts[i] > c.monthlyCapacityCents;
    return {
      contributorId: c.id,
      name: c.name,
      monthlyCents: amounts[i],
      unpaidHoursPerWeek: c.providesUnpaidHoursPerWeek,
      // Displayed beside cash, never netted against it. How a family weighs
      // time against money is their decision, not the app's.
      unpaidHoursValueCents: unpaidValue,
      ownsTaskCount: c.ownsTasks.length,
      exceedsCapacity: exceeds,
    };
  });

  return {
    method,
    shares,
    totalCents: amounts.reduce((a, b) => a + b, 0),
    unfundedCents: unfunded,
    fellBackToEqual,
    anyExceedsCapacity: shares.some((s) => s.exceedsCapacity),
  };
}
