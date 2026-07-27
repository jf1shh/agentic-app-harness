/**
 * Calculation transparency — the shape of a derivation (spec §6.10).
 *
 * A family is being asked to make an irreversible financial decision on the
 * strength of numbers this app produced. An unexplained projection is
 * indistinguishable from a guess with a nice font, so every displayed figure has
 * to be reproducible by a reader with a calculator.
 *
 * The hard rule that makes these trustworthy rather than decorative: an
 * explanation never *computes* anything. Every value is read out of an engine
 * result or an engine input. A second implementation of the same arithmetic
 * would drift from the first one silently, which is worse than showing nothing.
 */

export type ExplainStepKind =
  /** A published figure, carrying provenance. */
  | 'reference'
  /** A number the family typed in. */
  | 'input'
  /** Adds to the running total. */
  | 'add'
  /** Subtracts from the running total. */
  | 'subtract'
  /** The figure this whole explanation is about. Exactly one per explanation. */
  | 'result'
  /** Narrative between the arithmetic. Carries no value. */
  | 'note';

export interface ExplainStep {
  readonly label: string;
  /** The arithmetic in plain characters, e.g. "$35.00 × 40 hours × 52 ÷ 12". */
  readonly workingOut?: string;
  readonly valueCents?: number;
  /** For quantities that are not money: hours, months, percentages. */
  readonly valueText?: string;
  readonly kind: ExplainStepKind;
}

export type ExplanationId =
  | 'base-rate'
  | 'all-in'
  | 'first-month'
  | 'monthly-gap'
  | 'runway'
  | 'break-even'
  | 'split'
  | 'ledger'
  | 'sensitivity'
  | 'facility-fit';

export interface Explanation {
  readonly id: ExplanationId;
  readonly title: string;
  /** The accessible name of the "?" control that opens this explanation. */
  readonly question: string;
  /** What this number means, in one paragraph, without jargon. */
  readonly plainLanguage: string;
  /** The general form, before any of this family's numbers go into it. */
  readonly formula: string;
  /** The same formula with the numbers in it, line by line. */
  readonly steps: readonly ExplainStep[];
  /** Every rate and default actually applied to produce the figure. */
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  /** What the figure does not include, or cannot know. */
  readonly caveats: readonly string[];
}

/** Explanations for every headline figure currently on screen. */
export type ExplanationSet = Readonly<Record<ExplanationId, Explanation | null>>;

/** Signed contribution of one step to its explanation's running total. */
export function stepDelta(step: ExplainStep): number {
  if (step.valueCents === undefined) return 0;
  if (step.kind === 'add') return step.valueCents;
  if (step.kind === 'subtract') return -step.valueCents;
  return 0;
}

/** True when an explanation states its figure as a sum of parts. */
export function hasArithmetic(explanation: Explanation): boolean {
  return explanation.steps.some((s) => s.kind === 'add' || s.kind === 'subtract');
}

export function additiveTotalCents(explanation: Explanation): number {
  return explanation.steps.reduce((sum, step) => sum + stepDelta(step), 0);
}

export function resultStep(explanation: Explanation): ExplainStep | null {
  return explanation.steps.find((s) => s.kind === 'result') ?? null;
}

/**
 * Whether the parts shown add up to the total shown.
 *
 * This is the check a sceptical reader performs the moment the panel invites
 * them to. Failing it is as serious as a wrong number — the app would be caught
 * out by the very transparency it offered — so it is asserted in the unit tests
 * for every explanation the app can produce.
 */
export function isBalanced(explanation: Explanation): boolean {
  if (!hasArithmetic(explanation)) return true;
  const result = resultStep(explanation);
  if (!result || result.valueCents === undefined) return false;
  return additiveTotalCents(explanation) === result.valueCents;
}
