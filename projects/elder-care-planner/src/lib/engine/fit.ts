/**
 * Facility shortlist scoring (spec §11.2).
 *
 * A family tours four to six communities in about two weeks, under stress, and
 * then cannot reconstruct which one had the staff they liked. This engine turns
 * what they wrote down on the day into a comparison — and, deliberately, stops
 * short of turning it into a verdict.
 *
 * Three rules from the spec are enforced here rather than left to the UI,
 * because they are the difference between an honest comparison and false
 * precision dressed as arithmetic (§5.3):
 *
 *  1. A dimension nobody assessed is excluded from the mean, not scored zero.
 *     A community is not penalised for a question the family never got to ask.
 *  2. A dimension the family weighted at zero is excluded too, and separately —
 *     "we didn't look" and "we don't care" are different facts and the panel
 *     names both.
 *  3. Nothing here ranks, orders, or picks a winner. `compareFacilities` returns
 *     the facilities in the order they were entered, and there is deliberately
 *     no `bestFacilityId`. The composite is one input to a human decision; a
 *     tool that announced a winner on eight subjective scores would be claiming
 *     an authority it has not got.
 *
 * Pure, like every other engine (spec §4): no React, no storage, no ambient
 * `Date.now()`.
 */
import {
  FACILITY_DIMENSIONS,
  type FacilityDimension,
  type FacilityNote,
  type FacilityWeight,
} from '../schemas';

/** Applied to any dimension the family has not weighted. */
export const DEFAULT_WEIGHT = 1;
export const MAX_WEIGHT = 3;
export const MAX_SCORE = 5;

/** How many communities the shortlist holds. */
export const MAX_FACILITIES = 6;

export const WEIGHT_LABELS: Readonly<Record<number, string>> = {
  0: "Doesn't matter",
  1: 'Matters a little',
  2: 'Matters a lot',
  3: 'This is the decision',
};

/**
 * Every dimension's weight, with absent entries resolved to the default.
 *
 * Stored weights are a list rather than a `Record` so a payload written before
 * a dimension existed still parses (schemas.ts). The cost of that choice is
 * paid here, once: this is the only place that decides what an unstated weight
 * means, and the returned record is exhaustive, so consumers can index it
 * without a fallback of their own.
 */
export function resolveWeights(
  weights: readonly FacilityWeight[],
): Readonly<Record<FacilityDimension, number>> {
  const out = {} as Record<FacilityDimension, number>;
  for (const { dimension } of FACILITY_DIMENSIONS) out[dimension] = DEFAULT_WEIGHT;
  // Last entry wins, so a duplicated dimension is deterministic rather than
  // dependent on iteration luck.
  for (const w of weights) out[w.dimension] = w.weight;
  return out;
}

/** One dimension's contribution to a facility's composite. */
export interface FitPart {
  readonly dimension: FacilityDimension;
  readonly label: string;
  readonly score: number;
  readonly weight: number;
  /** score × weight — the quantity that is summed. */
  readonly weightedPoints: number;
}

export interface FacilityFit {
  readonly facilityId: string;
  readonly label: string;
  /** Dimensions with both a score and a non-zero weight, in display order. */
  readonly parts: readonly FitPart[];
  /** Scored, but weighted at zero — excluded because the family said so. */
  readonly notWeighted: readonly FacilityDimension[];
  /** Never assessed — excluded because there is nothing to average. */
  readonly unrated: readonly FacilityDimension[];
  readonly weightedPointsTotal: number;
  readonly weightTotal: number;
  /**
   * The weighted mean, 1–5, or null when nothing is both scored and weighted.
   * Null is a real answer ("not enough was recorded to compare this one") and
   * must not be rendered as a zero.
   */
  readonly compositeScore: number | null;
}

export function scoreFacility(
  facility: FacilityNote,
  weights: Readonly<Record<FacilityDimension, number>>,
): FacilityFit {
  const parts: FitPart[] = [];
  const notWeighted: FacilityDimension[] = [];
  const unrated: FacilityDimension[] = [];

  // Iterating the canonical dimension list rather than the stored ratings keeps
  // the output in display order and makes an unrated dimension visible as an
  // omission rather than as an absence nobody notices.
  for (const { dimension, label } of FACILITY_DIMENSIONS) {
    const rating = facility.ratings.find((r) => r.dimension === dimension);
    const score = rating?.score;
    if (score === undefined) {
      unrated.push(dimension);
      continue;
    }
    const weight = weights[dimension];
    if (weight <= 0) {
      notWeighted.push(dimension);
      continue;
    }
    parts.push({ dimension, label, score, weight, weightedPoints: score * weight });
  }

  const weightedPointsTotal = parts.reduce((sum, p) => sum + p.weightedPoints, 0);
  const weightTotal = parts.reduce((sum, p) => sum + p.weight, 0);

  return {
    facilityId: facility.id,
    label: facility.label,
    parts,
    notWeighted,
    unrated,
    weightedPointsTotal,
    weightTotal,
    compositeScore: weightTotal > 0 ? weightedPointsTotal / weightTotal : null,
  };
}

/**
 * Every facility scored against one shared set of weights.
 *
 * Order is the order the family entered them. There is no sort and no winner —
 * see the note at the top of this file.
 */
export function compareFacilities(
  facilities: readonly FacilityNote[],
  weights: readonly FacilityWeight[],
): readonly FacilityFit[] {
  const resolved = resolveWeights(weights);
  return facilities.map((f) => scoreFacility(f, resolved));
}

/** One dimension across every facility, for the comparison table's rows. */
export interface DimensionRow {
  readonly dimension: FacilityDimension;
  readonly label: string;
  readonly hint: string;
  readonly weight: number;
  readonly scores: readonly { facilityId: string; score: number | null }[];
}

export function dimensionRows(
  facilities: readonly FacilityNote[],
  weights: readonly FacilityWeight[],
): readonly DimensionRow[] {
  const resolved = resolveWeights(weights);
  return FACILITY_DIMENSIONS.map(({ dimension, label, hint }) => ({
    dimension,
    label,
    hint,
    weight: resolved[dimension],
    scores: facilities.map((f) => ({
      facilityId: f.id,
      score: f.ratings.find((r) => r.dimension === dimension)?.score ?? null,
    })),
  }));
}

/**
 * What pricing the plan at a community would do to it (spec §11.2.3).
 *
 * Both sides are engine output — the current plan's figures and the same
 * engines re-run against the community's quoted figures. Nothing here
 * recalculates a cost or a runway; it states the difference between two results
 * that were each produced properly, which is the same discipline `explain/`
 * works under.
 *
 * A null depletion month means the money is not projected to run out within the
 * horizon. That is a materially different answer from a long runway, so the
 * delta is null rather than a large number — subtracting "never" from a month
 * would manufacture a figure with no meaning.
 */
export interface CostSide {
  readonly allInMonthlyCents: number;
  readonly depletionMonth: number | null;
}

export interface CostConsequence {
  readonly monthlyDeltaCents: number;
  readonly runwayDeltaMonths: number | null;
  readonly baseline: CostSide;
  readonly facility: CostSide;
}

export function costConsequence(baseline: CostSide, facility: CostSide): CostConsequence {
  const bothDeplete = baseline.depletionMonth !== null && facility.depletionMonth !== null;
  return {
    monthlyDeltaCents: facility.allInMonthlyCents - baseline.allInMonthlyCents,
    runwayDeltaMonths: bothDeplete
      ? (facility.depletionMonth as number) - (baseline.depletionMonth as number)
      : null,
    baseline,
    facility,
  };
}

/** Composite rendered at the precision it is actually known to. */
export function formatComposite(score: number | null): string {
  if (score === null) return 'not enough recorded';
  return `${score.toFixed(1)} out of ${MAX_SCORE}`;
}
