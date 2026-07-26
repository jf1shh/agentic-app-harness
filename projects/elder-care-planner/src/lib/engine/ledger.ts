/**
 * Contribution Ledger (spec §6.6).
 *
 * A split that stays theoretical settles nothing. This reconciles what each
 * contributor pledged against what they actually paid, and totals spend by
 * category so the tax estimate has something real to work from.
 */
import type { Contributor, LedgerEntry, ExpenseCategory } from '../schemas';

export interface ContributorReconciliation {
  readonly contributorId: string;
  readonly name: string;
  readonly pledgedMonthlyCents: number;
  readonly paidTotalCents: number;
  readonly expectedToDateCents: number;
  /** Positive means ahead of what was expected; negative means behind. */
  readonly balanceCents: number;
}

export interface LedgerSummary {
  readonly totalPaidCents: number;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly deductibleCandidateCents: number;
  readonly reconciliation: readonly ContributorReconciliation[];
  readonly entryCount: number;
}

export interface LedgerInput {
  readonly entries: readonly LedgerEntry[];
  readonly contributors: readonly Contributor[];
  /** Pledged or assigned monthly share per contributor id. */
  readonly monthlySharesCents: Readonly<Record<string, number>>;
  /** Months elapsed since the plan started, used to compute what was expected. */
  readonly monthsElapsed: number;
}

export function summariseLedger(input: LedgerInput): LedgerSummary {
  const byCategory: Record<string, number> = {};
  let totalPaid = 0;
  let deductible = 0;
  const paidByContributor: Record<string, number> = {};

  for (const entry of input.entries) {
    totalPaid += entry.amountCents;
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + entry.amountCents;
    if (entry.taxDeductibleCandidate) deductible += entry.amountCents;
    paidByContributor[entry.contributorId] =
      (paidByContributor[entry.contributorId] ?? 0) + entry.amountCents;
  }

  const reconciliation = input.contributors.map((c) => {
    const pledged = input.monthlySharesCents[c.id] ?? 0;
    const expected = pledged * input.monthsElapsed;
    const paid = paidByContributor[c.id] ?? 0;
    return {
      contributorId: c.id,
      name: c.name,
      pledgedMonthlyCents: pledged,
      paidTotalCents: paid,
      expectedToDateCents: expected,
      balanceCents: paid - expected,
    };
  });

  return {
    totalPaidCents: totalPaid,
    byCategory,
    deductibleCandidateCents: deductible,
    reconciliation,
    entryCount: input.entries.length,
  };
}

/** Total spend in a category, or zero when nothing has been logged. */
export function categoryTotal(summary: LedgerSummary, category: ExpenseCategory): number {
  return summary.byCategory[category] ?? 0;
}
