'use client';

import {
  STARTING_GUIDE_GROUPS,
  TOURING_GUIDANCE,
  needsFundingDisclosure,
  type ResourceFunding,
} from '@/lib/data/startingGuide';
import { CollapsibleCard } from './CollapsibleCard';

/**
 * "Where to start looking" (spec §11.13).
 *
 * The rest of the app answers what care costs. This panel answers the question
 * that comes before it: who to call, and what to look at on a tour.
 *
 * The funding label beside each named organisation is the point, not decoration.
 * A referral service earning a commission when a family moves in is worth
 * reading and is not impartial, and the reader is the one who should get to
 * weigh that — the same reasoning §6's Cite Confidence rule applies to figures.
 */

const FUNDING_LABEL: Record<ResourceFunding, string> = {
  government: 'Government',
  nonprofit: 'Nonprofit',
  commercial_referral: 'Paid referral service',
  commercial: 'Commercial',
};

export function StartingGuidePanel() {
  const flaggedCount = STARTING_GUIDE_GROUPS.flatMap((g) => g.resources).filter((r) =>
    needsFundingDisclosure(r.funding),
  ).length;

  return (
    <CollapsibleCard
      id="starting-guide"
      title="Where to start looking"
      status={`Steps, and ${flaggedCount} listed services that are paid by providers`}
    >
      <p className="hint">
        The practical side of the search. Every organisation named below carries a label saying how
        it is funded, because some of the most prominent directories are paid by the communities
        they recommend.
      </p>

      <h3>Touring a community</h3>
      <ul data-testid="touring-guidance">
        {TOURING_GUIDANCE.map((step) => (
          <li key={step.id} data-testid={`touring-${step.id}`}>
            <strong>{step.title}.</strong> {step.detail}
          </li>
        ))}
      </ul>

      {STARTING_GUIDE_GROUPS.map((group) => (
        <section key={group.id} data-testid={`guide-group-${group.id}`}>
          <h3>{group.title}</h3>
          <p className="hint">{group.intro}</p>
          <ul>
            {group.resources.map((resource) => (
              <li key={resource.id} data-testid={`guide-resource-${resource.id}`}>
                <strong>
                  {resource.url ? (
                    // Ordinary anchors. The app fetches nothing here, so §1.2
                    // holds and the privacy specs pass with requests blocked.
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      {resource.name}
                    </a>
                  ) : (
                    resource.name
                  )}
                </strong>{' '}
                <span className="tag" data-testid={`guide-funding-${resource.id}`}>
                  {FUNDING_LABEL[resource.funding]}
                </span>
                <br />
                {resource.what}
                {resource.fundingNote ? (
                  <>
                    {' '}
                    <em data-testid={`guide-funding-note-${resource.id}`}>{resource.fundingNote}</em>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="hint">
        Buy-in and rental contracts, refund terms and waitlists are compared in the independent
        living and shortlist sections. What to ask before signing has its own section.
      </p>
    </CollapsibleCard>
  );
}
