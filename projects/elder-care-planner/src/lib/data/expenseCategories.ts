/**
 * Plain-language names for the ledger's expense categories.
 *
 * The enum values are the contract (`ExpenseCategorySchema`); these are what a
 * family reads. Kept in one place so the ledger table, the category totals and
 * the derivation all name a category identically — a reconciliation where the
 * same category is called two different things in two tables invites exactly
 * the "that isn't what I paid for" argument the ledger exists to prevent.
 */
import type { ExpenseCategory } from '../schemas';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  medication: 'Medication',
  supplies: 'Supplies',
  transport: 'Transport',
  dental_vision_hearing: 'Dental, vision or hearing',
  home_modification: 'Home modification',
  legal: 'Legal and professional fees',
  respite: 'Respite care',
  other: 'Other',
};

/**
 * Categories that commonly qualify as unreimbursed medical expenses. Used only
 * to pre-tick the "may count toward medical expenses" box as a convenience —
 * the family can always override it, and the app never decides a tax position
 * (spec §1.1, §6.9).
 */
export const LIKELY_DEDUCTIBLE_CATEGORIES: readonly ExpenseCategory[] = [
  'medication',
  'supplies',
  'dental_vision_hearing',
  'home_modification',
  'respite',
];
