import { describe, it, expect } from 'vitest';
import { ExpenseCategorySchema } from '../schemas';
import type { ExpenseCategory } from '../schemas';
import { EXPENSE_CATEGORY_LABELS, LIKELY_DEDUCTIBLE_CATEGORIES } from './expenseCategories';

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; proved by mutation.
//
// The module's own comment states the requirement: the ledger table, the
// category totals and the derivation must all name a category identically, or
// a reconciliation invites the "that isn't what I paid for" argument the ledger
// exists to prevent. That only holds if the map is total over the contract.

const ALL_CATEGORIES = ExpenseCategorySchema.options as readonly ExpenseCategory[];

describe('EXPENSE_CATEGORY_LABELS', () => {
  it('Given every member of the ExpenseCategory contract, When labels are looked up, Then each has a non-empty label', () => {
    for (const category of ALL_CATEGORIES) {
      expect(EXPENSE_CATEGORY_LABELS[category], `no label for '${category}'`).toBeTruthy();
      expect(EXPENSE_CATEGORY_LABELS[category].trim().length).toBeGreaterThan(0);
    }
  });

  it('Given the label map, When its keys are compared with the contract, Then it declares no category the contract does not have', () => {
    expect(Object.keys(EXPENSE_CATEGORY_LABELS).sort()).toEqual([...ALL_CATEGORIES].sort());
  });

  it('Given the label map, When labels are collected, Then no two categories read identically', () => {
    // Two categories sharing a label is precisely the ambiguity the module set
    // out to remove: the same words would total to two different figures.
    const labels = Object.values(EXPENSE_CATEGORY_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('LIKELY_DEDUCTIBLE_CATEGORIES', () => {
  it('Given the pre-tick list, When each entry is checked, Then all of them are real expense categories', () => {
    for (const category of LIKELY_DEDUCTIBLE_CATEGORIES) {
      expect(ALL_CATEGORIES).toContain(category);
    }
  });

  it('Given the pre-tick list, When entries are counted, Then none appears twice', () => {
    expect(new Set(LIKELY_DEDUCTIBLE_CATEGORIES).size).toBe(LIKELY_DEDUCTIBLE_CATEGORIES.length);
  });

  it('Given the pre-tick list, When it is compared with the full set, Then it is a convenience default rather than everything', () => {
    // The app never decides a tax position (§1.1, §6.9). A list covering every
    // category would stop being a hint and start being an assertion that all
    // care spending is deductible.
    expect(LIKELY_DEDUCTIBLE_CATEGORIES.length).toBeGreaterThan(0);
    expect(LIKELY_DEDUCTIBLE_CATEGORIES.length).toBeLessThan(ALL_CATEGORIES.length);
  });

  it('Given categories that are not medical in nature, When the pre-tick list is checked, Then they are not ticked by default', () => {
    // 'other' is unclassifiable by definition and 'legal' is generally not an
    // unreimbursed medical expense; pre-ticking either would nudge a family
    // toward a position the app is not entitled to take.
    expect(LIKELY_DEDUCTIBLE_CATEGORIES).not.toContain('other');
    expect(LIKELY_DEDUCTIBLE_CATEGORIES).not.toContain('legal');
  });
});
