/**
 * Recommendation copy.
 *
 * Two constraints from the spec are enforced here rather than left to whoever
 * writes the JSX:
 *
 *  - §5.2  Lead with a decision and a next action, not a table.
 *  - §5.4  Neutral third-party voice. When the *app* states the split, it is not
 *          the sister stating it, and that reframing does real work at a family
 *          meeting. So: no second person, no "you should", and no characterising
 *          any family member.
 *
 * Kept as pure string-building so the voice constraint is unit-testable.
 */
import type { ScenarioResult } from './engine/plan';
import type { BreakEvenResult } from './engine/breakeven';
import type { SplitResult } from './engine/split';
import { formatCents, formatRunwayBand } from './format';

export interface Recommendation {
  readonly headline: string;
  readonly runwayLine: string;
  readonly topDriverLine: string | null;
  readonly nextAction: string;
  readonly warnings: readonly string[];
}

function hoursText(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hours a week`;
}

export function buildRecommendation(
  result: ScenarioResult,
  breakEven: BreakEvenResult | null,
  split: SplitResult | null,
  careRecipientLabel: string,
): Recommendation {
  const { cost, runway, sensitivity } = result;
  const subject = careRecipientLabel.trim() || 'the care recipient';

  const headline = `Care for ${subject} is projected to cost ${formatCents(
    cost.allInMonthlyCents,
  )} a month once the fees beyond base rent are included.`;

  const runwayLine =
    runway.depletionMonth === null
      ? `Income covers that cost, so savings are not projected to run out within the ${
          runway.projectionMonths / 12
        }-year horizon.`
      : `Savings and income together cover it for ${formatRunwayBand(
          sensitivity.bandLowMonths,
          sensitivity.bandHighMonths,
        )}.`;

  const topDriverLine = sensitivity.topLever
    ? `The figure that moves this range most is ${sensitivity.topLever.label.toLowerCase()} — ${sensitivity.topLever.description}`
    : null;

  const warnings: string[] = [];

  if (cost.deltaPercent > 0) {
    warnings.push(
      `The advertised rate is ${formatCents(cost.advertisedBaseCents)}. The realistic all-in cost is ${Math.round(
        cost.deltaPercent,
      )}% higher once tiers and add-on fees are counted.`,
    );
  }

  if (cost.oneTimeCents > 0) {
    warnings.push(
      `Month one is ${formatCents(cost.firstMonthCents)}, because one-time move-in costs of ${formatCents(
        cost.oneTimeCents,
      )} land at the start and are usually non-refundable.`,
    );
  }

  if (runway.borrowingStartMonth !== null) {
    warnings.push(
      `From month ${runway.borrowingStartMonth}, the amount needed exceeds what the family has said it can afford, which means borrowing.`,
    );
  }

  if (split?.anyExceedsCapacity) {
    warnings.push(
      'At least one share is larger than the amount that contributor recorded as affordable.',
    );
  }

  if (split?.fellBackToEqual) {
    warnings.push(
      'An income-proportional split was requested, but income was missing for at least one contributor, so these figures use an equal split.',
    );
  }

  if (split && split.unfundedCents > 0) {
    warnings.push(
      `Pledges are ${formatCents(split.unfundedCents)} a month short of the gap.`,
    );
  }

  let nextAction: string;
  if (breakEven && !breakEven.residentialAlwaysCheaper && Number.isFinite(breakEven.breakEvenHoursPerWeek)) {
    const cheaper = breakEven.cheaperOption === 'in_home' ? 'Care at home' : 'Residential care';
    nextAction =
      breakEven.cheaperOption === 'equal'
        ? `The two options cost about the same at present. The crossover is ${hoursText(breakEven.breakEvenHoursPerWeek)} of paid help.`
        : `${cheaper} is currently cheaper by ${formatCents(
            breakEven.monthlyDifferenceCents,
          )} a month. The crossover is ${hoursText(breakEven.breakEvenHoursPerWeek)} of paid help — past that point, residential care costs less.`;
  } else if (cost.usedOverride) {
    nextAction =
      'These figures use a real quote, which is the most reliable basis available. The questions below are worth asking before anything is signed.';
  } else {
    nextAction =
      'These figures use published medians. Adding a real quote from a specific provider will sharpen them considerably.';
  }

  return { headline, runwayLine, topDriverLine, nextAction, warnings };
}
