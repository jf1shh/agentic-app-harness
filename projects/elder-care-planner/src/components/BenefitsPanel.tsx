'use client';

import { BENEFIT_CARDS, BENEFITS_CHECKED_ON } from '@/lib/data/benefits';
import { CollapsibleCard } from './CollapsibleCard';

/**
 * The Medicare card leads deliberately. Assuming Medicare pays for long-term
 * custodial care is the most expensive misconception in this domain, so the
 * correction sits on the results page rather than in a help article.
 */
export function BenefitsPanel() {
  return (
    // The status line carries the Medicare correction rather than a count of
    // cards. This panel exists because assuming Medicare pays for custodial care
    // is the most expensive misconception in the domain, and a collapsed section
    // labelled "3 programmes" would put that correction behind a click — which
    // is precisely the help-article treatment this panel was built to avoid.
    <CollapsibleCard
      id="benefits"
      title="What public benefits will and will not cover"
      status="Medicare does not pay for long-term custodial care"
      noPrint
    >
      <p className="callout" data-testid="medicare-correction">
        <strong>Medicare does not pay for long-term custodial care.</strong> It does not cover
        assisted living rent, and it does not cover a long-term nursing home stay. Plan as though
        it will contribute nothing to ongoing care.
      </p>

      {BENEFIT_CARDS.map((card) => (
        <details key={card.id} data-testid={`benefit-${card.id}`}>
          <summary>
            {card.name} — {card.headline}
          </summary>
          <div className="details-body">
            <h3>Covers</h3>
            <ul>
              {card.covers.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <h3>Does not cover</h3>
            <ul>
              {card.doesNotCover.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <h3>The timing trap</h3>
            <p>{card.timingTrap}</p>
            <h3>What to do</h3>
            <p>{card.nextStep}</p>
            <p className="provenance">
              {card.sourceNote} Checked {BENEFITS_CHECKED_ON}.
            </p>
          </div>
        </details>
      ))}

      <p className="provenance">
        This is a plain-language summary, not an eligibility determination. Medicaid rules in
        particular are state-specific, and this app deliberately does not model them.
      </p>
    </CollapsibleCard>
  );
}
