'use client';

import { EXPLANATION_ORDER } from '@/lib/explain/build';
import { useExplain } from './ExplainProvider';
import { ExplanationBody } from './ExplanationBody';

/**
 * Every derivation on the page at once.
 *
 * A control that has to be *discovered* is not transparency, so the panels
 * behind the question marks are also laid out here in full: readable in one
 * pass, findable with the browser's own find-in-page, and available to anyone
 * who wants to audit the method before trusting a number in it.
 *
 * Excluded from print so the Family Meeting Summary stays the one page it is
 * meant to be (spec §5.4).
 */
export function MethodologyPanel() {
  const { get } = useExplain();
  const available = EXPLANATION_ORDER.map((id) => get(id)).filter((e) => e !== null);

  if (available.length === 0) return null;

  return (
    <section className="card no-print" aria-labelledby="methodology-heading">
      <h2 id="methodology-heading">How every number on this page is worked out</h2>
      <p>
        Nothing here is a black box. Each figure below shows its formula, the numbers that went
        into it, where those numbers came from, and what it cannot account for. The same
        explanations open beside each figure from the
        <span aria-hidden="true"> “?” </span>
        <span className="visually-hidden"> question mark </span>
        buttons.
      </p>
      <p className="hint">
        Amounts in the working are shown to the cent so that the parts visibly add up to the
        totals. Headline figures elsewhere are rounded, and the runway is deliberately shown as a
        range rather than a single month — the precision of a projection is not the same thing as
        its accuracy.
      </p>

      {available.map((explanation) => (
        <details key={explanation.id} data-testid={`method-${explanation.id}`}>
          <summary>{explanation.title}</summary>
          <div className="details-body">
            <ExplanationBody explanation={explanation} />
          </div>
        </details>
      ))}
    </section>
  );
}
