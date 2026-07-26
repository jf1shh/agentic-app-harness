/**
 * Unit tests for the contribution ledger.
 *
 * A split that stays theoretical settles nothing; the reconciliation is what
 * makes it real.
 */
import { describe, it, expect } from 'vitest';
import { summariseLedger, categoryTotal } from './ledger';
import type { Contributor, LedgerEntry } from '../schemas';

const contributors: Contributor[] = [
  { id: 'c1', name: 'A', providesUnpaidHoursPerWeek: 0, ownsTasks: [] },
  { id: 'c2', name: 'B', providesUnpaidHoursPerWeek: 0, ownsTasks: [] },
];

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 'e1',
    contributorId: 'c1',
    date: '2026-01-15',
    amountCents: 50_000,
    category: 'medication',
    taxDeductibleCandidate: false,
    ...overrides,
  };
}

describe('Given three months of logged contributions', () => {
  const summary = summariseLedger({
    entries: [
      entry({ id: 'e1', contributorId: 'c1', amountCents: 100_000 }),
      entry({ id: 'e2', contributorId: 'c1', amountCents: 100_000 }),
      entry({ id: 'e3', contributorId: 'c2', amountCents: 50_000, category: 'transport' }),
    ],
    contributors,
    monthlySharesCents: { c1: 100_000, c2: 100_000 },
    monthsElapsed: 3,
  });

  it('When totalled, Then the ledger sums every entry', () => {
    expect(summary.totalPaidCents).toBe(250_000);
    expect(summary.entryCount).toBe(3);
  });

  it('When grouped, Then spend is broken out by category', () => {
    expect(categoryTotal(summary, 'medication')).toBe(200_000);
    expect(categoryTotal(summary, 'transport')).toBe(50_000);
    expect(categoryTotal(summary, 'legal')).toBe(0);
  });

  it('When reconciled, Then each contributor is measured against what was expected', () => {
    // Expected after 3 months at $1,000/mo = 300,000 each.
    const a = summary.reconciliation.find((r) => r.contributorId === 'c1');
    const b = summary.reconciliation.find((r) => r.contributorId === 'c2');
    expect(a?.paidTotalCents).toBe(200_000);
    expect(a?.balanceCents).toBe(-100_000); // behind by $1,000
    expect(b?.paidTotalCents).toBe(50_000);
    expect(b?.balanceCents).toBe(-250_000); // behind by $2,500
  });
});

describe('Given entries marked as possible medical deductions', () => {
  it('When summarised, Then only the flagged entries feed the tax estimate', () => {
    const summary = summariseLedger({
      entries: [
        entry({ id: 'e1', amountCents: 100_000, taxDeductibleCandidate: true }),
        entry({ id: 'e2', amountCents: 70_000, taxDeductibleCandidate: false }),
      ],
      contributors,
      monthlySharesCents: {},
      monthsElapsed: 1,
    });
    expect(summary.deductibleCandidateCents).toBe(100_000);
  });
});

describe('Given a ledger with nothing logged yet', () => {
  it('When summarised, Then totals are zero and contributors still appear', () => {
    const summary = summariseLedger({
      entries: [],
      contributors,
      monthlySharesCents: { c1: 100_000, c2: 100_000 },
      monthsElapsed: 2,
    });
    expect(summary.totalPaidCents).toBe(0);
    expect(summary.reconciliation).toHaveLength(2);
    expect(summary.reconciliation[0].balanceCents).toBe(-200_000);
  });
});
