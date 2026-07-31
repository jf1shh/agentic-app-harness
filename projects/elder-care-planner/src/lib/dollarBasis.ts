/**
 * Which dollars a figure is drawn in (spec §11.9).
 *
 * The app shows two kinds of money side by side, and until this module existed
 * it said so nowhere:
 *
 *  - The runway simulation compounds `annualEscalatorRate` on care and
 *    `colaRate` on income at each year boundary, and the IL overlay reads its
 *    series verbatim from that same engine. Both are therefore drawn in the
 *    **nominal dollars of each future month** — a figure in year eight is in
 *    year-eight money.
 *  - `engine/breakeven.ts` has no time dimension whatsoever. It prices one
 *    month at current rates, so the comparison is in **today's dollars**.
 *
 * An inflation-loaded projection and a today's-dollars comparison in adjacent
 * panels, with nothing on screen distinguishing them, is the transparency gap
 * §11.9 closes. Note what this module deliberately is NOT: it does not deflate
 * anything to real terms (that is §11.3's toggle, still unapproved) and it
 * changes no engine. It names a basis; it does not convert between them.
 *
 * Both the chart labels and the §6.10 derivation `assumptions` entries read
 * from here. Two copies of these sentences would drift the first time one was
 * edited, and a chart disagreeing with its own derivation about which dollars
 * it is drawing is worse than neither saying anything — it is the §6 "Explain
 * the Arithmetic Without Re-implementing It" failure applied to prose.
 */

import type { ExplanationId } from './explain/types';

export type DollarBasis =
  /** Future dollars: the figure has an escalator compounded into it. */
  | 'nominal'
  /** Today's dollars: a single month priced at current rates, uninflated. */
  | 'today';

/**
 * The short label that sits on the chart itself.
 *
 * Kept to one line because it shares space with the chart. The derivation
 * carries the longer statement.
 */
export const DOLLAR_BASIS_LABEL: Record<DollarBasis, string> = {
  nominal:
    'Figures are in future dollars — later years include rising care costs, so they are not directly comparable to today’s prices.',
  today:
    'Figures are in today’s dollars — this is one month at current rates, with no inflation applied.',
};

/**
 * The sentence added to a derivation's `assumptions` array (§6.10).
 *
 * Longer than the chart label because the derivation panel is where a reader
 * has gone looking for exactly this, and §11.9 asks for the growth rates to be
 * surfaced rather than merely alluded to.
 */
export const DOLLAR_BASIS_ASSUMPTION: Record<DollarBasis, string> = {
  nominal:
    'Figures are shown in the dollars of each future month, not in today’s dollars: the projection '
    + 'compounds the annual care escalator on care costs and the cost-of-living rate on income at '
    + 'each year boundary, so inflation is already inside these numbers rather than missing from them.',
  today:
    'Figures are shown in today’s dollars: this is a single month priced at current rates, with no '
    + 'inflation applied and no projection over time.',
};

/**
 * The basis a given derivation's figures are stated in.
 *
 * Only the two projection-backed derivations are nominal. Everything else
 * reports a current-rate figure, and defaulting those to `nominal` would
 * attach an escalator claim to a number that has none — the same class of
 * error as the spec's original blanket "today's dollars" wording, pointed the
 * other way.
 */
const NOMINAL_EXPLANATIONS: ReadonlySet<ExplanationId> = new Set<ExplanationId>([
  'runway',
  'sensitivity',
]);

export function basisForExplanation(id: ExplanationId): DollarBasis {
  return NOMINAL_EXPLANATIONS.has(id) ? 'nominal' : 'today';
}
