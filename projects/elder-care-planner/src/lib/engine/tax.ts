/**
 * Medical expense deduction estimate (spec §6.9).
 *
 * An estimate, clearly labelled as one. Unreimbursed medical expenses above
 * 7.5% of adjusted gross income may be deductible when itemising, and
 * qualifying long-term care costs can count when care follows a plan of care
 * for a chronically ill person.
 *
 * This engine will not tell anyone they qualify — it shows the arithmetic and
 * says where a tax professional is needed (spec §1.1).
 */

/** Unreimbursed medical expenses are deductible above this share of AGI. */
export const AGI_THRESHOLD_RATE = 0.075;

export interface TaxEstimateInput {
  readonly adjustedGrossIncomeCents: number;
  readonly qualifyingMedicalExpensesCents: number;
  /** Number of people sharing support of the care recipient. */
  readonly supportingContributorCount: number;
  /** Whether any single contributor provides more than half of total support. */
  readonly anyContributorProvidesMajoritySupport: boolean;
}

export interface TaxEstimateResult {
  readonly thresholdCents: number;
  /** Expenses above the threshold — the potentially deductible amount. */
  readonly deductibleCents: number;
  readonly meetsThreshold: boolean;
  /**
   * True when several people share support and nobody passes the 50% mark, the
   * situation a multiple support declaration exists for.
   */
  readonly multipleSupportFlag: boolean;
}

export function estimateMedicalDeduction(input: TaxEstimateInput): TaxEstimateResult {
  const threshold = Math.round(input.adjustedGrossIncomeCents * AGI_THRESHOLD_RATE);
  const deductible = Math.max(0, input.qualifyingMedicalExpensesCents - threshold);

  return {
    thresholdCents: threshold,
    deductibleCents: deductible,
    meetsThreshold: deductible > 0,
    multipleSupportFlag:
      input.supportingContributorCount > 1 && !input.anyContributorProvidesMajoritySupport,
  };
}
