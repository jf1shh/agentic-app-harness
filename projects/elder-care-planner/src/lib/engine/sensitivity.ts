/**
 * Sensitivity — "what would change this answer" (spec §6.4).
 *
 * Re-runs the projection with one input perturbed at a time and ranks the levers
 * by how much they move the runway. The intent is as much pedagogical as
 * analytical: showing that a care-level bump outweighs a market downturn teaches
 * something that survives the user closing the tab.
 *
 * It also produces the range the UI is required to display instead of a single
 * false-precision number (§5.3).
 */
import { computeRunway, type RunwayInput, type RunwayResult } from './runway';
import { ANNUAL_ESCALATOR_BAND } from '../data/feeStructures';
import { TYPICAL_FEE_RANGES } from '../data/feeStructures';

/**
 * Planning bands for levers that no survey publishes. These are explicitly
 * planning assumptions — conservative vs. optimistic ends of a reasonable range
 * — not measured data, and the UI labels them that way.
 */
export const PLANNING_BANDS = {
  assetReturnRate: { low: 0.0, high: 0.06 },
  incomeColaRate: { low: 0.0, high: 0.03 },
  /** Proportional swing applied to entered ancillary spend. */
  ancillarySwing: 0.5,
} as const;

export type LeverId =
  | 'annual_escalator'
  | 'care_level_tier'
  | 'asset_return'
  | 'income_cola'
  | 'ancillary_spend';

export interface SensitivityLever {
  readonly id: LeverId;
  readonly label: string;
  /** Plain-language explanation of what this lever is. */
  readonly description: string;
  /** How many months of runway separate the low and high cases. */
  readonly impactMonths: number;
  readonly lowDepletionMonth: number | null;
  readonly highDepletionMonth: number | null;
  /** Whether the band comes from published data or is a planning assumption. */
  readonly basis: 'published_range' | 'planning_assumption';
}

export interface SensitivityResult {
  readonly levers: readonly SensitivityLever[];
  readonly topLever: SensitivityLever | null;
  /** Shortest runway seen across every single-lever perturbation. */
  readonly bandLowMonths: number | null;
  /** Longest runway seen across every single-lever perturbation. */
  readonly bandHighMonths: number | null;
  readonly baseline: RunwayResult;
}

/**
 * Treat "never depletes" as one month past the horizon so comparisons stay
 * numeric and deterministic rather than collapsing to NaN.
 */
function effectiveDepletion(result: RunwayResult): number {
  return result.depletionMonth ?? result.projectionMonths + 1;
}

const CARE_LEVEL_TIER_HIGH_CENTS =
  TYPICAL_FEE_RANGES.find((r) => r.id === 'care_level_tier')?.highCents ?? 200_000;

interface LeverSpec {
  readonly id: LeverId;
  readonly label: string;
  readonly description: string;
  readonly basis: SensitivityLever['basis'];
  readonly low: (input: RunwayInput) => RunwayInput;
  readonly high: (input: RunwayInput) => RunwayInput;
}

const LEVER_SPECS: readonly LeverSpec[] = [
  {
    id: 'annual_escalator',
    label: 'Annual rate increases',
    description:
      'Communities commonly raise rates 3–5% a year. It compounds, and it is the quietest way a plan runs out early.',
    basis: 'published_range',
    low: (i) => ({ ...i, annualEscalatorRate: ANNUAL_ESCALATOR_BAND.low }),
    high: (i) => ({ ...i, annualEscalatorRate: ANNUAL_ESCALATOR_BAND.high }),
  },
  {
    id: 'care_level_tier',
    label: 'A move up the care levels',
    description:
      'A reassessment can raise the monthly bill by $500–$2,000 at any time, without the base rent changing at all.',
    basis: 'published_range',
    low: (i) => ({ ...i, careLevelIncrease: undefined }),
    high: (i) => ({
      ...i,
      careLevelIncrease: { atMonth: 13, cents: CARE_LEVEL_TIER_HIGH_CENTS },
    }),
  },
  {
    id: 'asset_return',
    label: 'Investment returns',
    description: 'What the remaining savings earn while they are being spent down.',
    basis: 'planning_assumption',
    low: (i) => ({
      ...i,
      assets: i.assets.map((a) => ({ ...a, annualReturnRate: PLANNING_BANDS.assetReturnRate.low })),
    }),
    high: (i) => ({
      ...i,
      assets: i.assets.map((a) => ({ ...a, annualReturnRate: PLANNING_BANDS.assetReturnRate.high })),
    }),
  },
  {
    id: 'income_cola',
    label: 'Cost-of-living rises in income',
    description: 'Whether Social Security and pension income keeps pace with care costs.',
    basis: 'planning_assumption',
    low: (i) => ({
      ...i,
      income: i.income.map((s) => ({ ...s, colaRate: PLANNING_BANDS.incomeColaRate.low })),
    }),
    high: (i) => ({
      ...i,
      income: i.income.map((s) => ({ ...s, colaRate: PLANNING_BANDS.incomeColaRate.high })),
    }),
  },
  {
    id: 'ancillary_spend',
    label: 'Medications, supplies and transport',
    description: 'The everyday costs around care, which are easy to underestimate at the start.',
    basis: 'planning_assumption',
    low: (i) => ({
      ...i,
      ancillaryMonthlyCents: Math.round(
        i.ancillaryMonthlyCents * (1 - PLANNING_BANDS.ancillarySwing),
      ),
    }),
    high: (i) => ({
      ...i,
      ancillaryMonthlyCents: Math.round(
        i.ancillaryMonthlyCents * (1 + PLANNING_BANDS.ancillarySwing),
      ),
    }),
  },
];

export function computeSensitivity(input: RunwayInput): SensitivityResult {
  const baseline = computeRunway(input);

  const levers: SensitivityLever[] = LEVER_SPECS.map((spec) => {
    const lowRun = computeRunway(spec.low(input));
    const highRun = computeRunway(spec.high(input));
    const impactMonths = Math.abs(effectiveDepletion(lowRun) - effectiveDepletion(highRun));
    return {
      id: spec.id,
      label: spec.label,
      description: spec.description,
      impactMonths,
      lowDepletionMonth: lowRun.depletionMonth,
      highDepletionMonth: highRun.depletionMonth,
      basis: spec.basis,
    };
  });

  // Sort by impact, then by id, so the ranking is fully deterministic and a
  // lever with no effect ranks last rather than being dropped.
  const sorted = levers
    .slice()
    .sort((a, b) => (b.impactMonths - a.impactMonths) || a.id.localeCompare(b.id));

  const allDepletions = levers.flatMap((l) => [
    l.lowDepletionMonth ?? baseline.projectionMonths + 1,
    l.highDepletionMonth ?? baseline.projectionMonths + 1,
  ]);

  const neverDepletes = baseline.depletionMonth === null &&
    allDepletions.every((d) => d > baseline.projectionMonths);

  return {
    levers: sorted,
    topLever: sorted.length > 0 && sorted[0].impactMonths > 0 ? sorted[0] : null,
    bandLowMonths: neverDepletes ? null : Math.min(...allDepletions),
    bandHighMonths: neverDepletes ? null : Math.max(...allDepletions),
    baseline,
  };
}
