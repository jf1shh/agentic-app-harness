'use client';

import {
  CATEGORY_LABELS,
  GUIDE_CATEGORY_ORDER,
  INTAKE_LABEL,
  STARTING_GUIDE_CHECKED_ON,
  STARTING_GUIDE_ENTRIES,
  confidenceLabel,
  type GuideCategory,
  type GuideEntry,
} from '@/lib/data/startingGuide';
import { CollapsibleCard } from './CollapsibleCard';
import { ExternalLink } from './ExternalLink';

/**
 * The starting-guide panel (spec §11.11).
 *
 * A read-only, non-charged directory of services a family commonly
 * investigates when care arrives. Five flat, always-open category lists sit
 * inside one `<CollapsibleCard>`. The panel is closed on first load per the
 * §5.1a progressive-disclosure rule; nothing in here writes to `PlanState`,
 * so the parent's privacy stance is not affected by opening it.
 *
 * Three panels have a precedent for the same status-line discipline this one
 * follows — the Facilities panel counts without ranking (§11.2), the Benefits
 * panel surfaces an editorial correction rather than a count (§6.8), and
 * this one carries the §1.1 trust promise ("this app does not earn referral
 * fees from any listed service") rather than an entry count. A status line
 * learned from a count would describe the directory; a status line learned
 * from the trust promise describes the app.\n */
export function StartingGuidePanel() {
  const grouped = new Map<GuideCategory, GuideEntry[]>(
    GUIDE_CATEGORY_ORDER.map((c) => [c, [] as GuideEntry[]]),
  );
  for (const entry of STARTING_GUIDE_ENTRIES) {
    grouped.get(entry.category)!.push(entry);
  }

  return (
    <CollapsibleCard
      id="guide"
      title="A starting guide to outside help"
      // Per the §5.1a lesson that the status text is a figure or correction,
      // not a count: this panel exists for the trust claim, so its status
      // line carries the trust claim.
      status="This app does not earn a fee from any listed resource"
      noPrint
    >
      <p className="hint">
        Below are services that families commonly investigate when care arrives.
        This page is not a directory: the lists below are a starting point,
        curated not comprehensive. <strong>This app does not earn a referral
        fee or affiliate payment from any of these resources.</strong>
      </p>

      <p className="hint">
        Some entries are <em>matching services</em> — platforms that earn a fee
        from the provider when a family connects with one through them.
        Those services do not charge the family; this app charges neither.
        The intake tag on each entry states which kind it is.
      </p>

      {GUIDE_CATEGORY_ORDER.map((category) => {
        const items = grouped.get(category) ?? [];
        const { heading, intro } = CATEGORY_LABELS[category];
        return (
          <section
            key={category}
            className="guide-category"
            data-testid={`guide-category-${category}`}
            aria-label={heading}
          >
            <h3>{heading}</h3>
            <p className="hint">{intro}</p>
            <ul>
              {items.map((entry) => (
                <li key={entry.id} data-testid={`guide-entry-${entry.id}`}>
                  <div className="guide-entry-head">
                    {entry.url ? (
                      <ExternalLink href={entry.url}>{entry.label}</ExternalLink>
                    ) : (
                      <span>{entry.label}</span>
                    )}
                    <span className="intake-tag" data-testid={`guide-intake-${entry.id}`}>
                      {INTAKE_LABEL[entry.intake]}
                    </span>
                  </div>
                  <p>{entry.note}</p>
                  <p className="hint" data-testid={`guide-confidence-${entry.id}`}>
                    {confidenceLabel(entry.confidence)} on {entry.checkedOn}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="hint">
        The list was reviewed {STARTING_GUIDE_CHECKED_ON}. The categories are
        user-supplied. The services are real; the rankings between them are
        not — adding one did not displace any other.
      </p>
    </CollapsibleCard>
  );
}
