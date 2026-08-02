'use client';

import { useState } from 'react';
import { decodePlanFromShare } from '@/lib/share';
import { computePlan, computeBreakEvenForPlan } from '@/lib/engine/plan';
import { formatCents } from '@/lib/format';
import { ResultsPanel } from './ResultsPanel';
import { ExplainProvider } from './ExplainProvider';
import type { ExplanationSet } from '@/lib/explain/types';
import type { SharedPlanPayload } from '@/lib/schemas';

/**
 * No derivation is built for a shared snapshot. `buildExplanations` needs
 * fields a `Plan` does not carry — months elapsed, the state a break-even
 * comparison's hourly rate came from — and inventing defaults for them would
 * put a derivation on screen that is not actually how this figure was
 * reached. Every `WhyButton` reads `null` here and renders nothing, which is
 * the honest absence rather than a wrong explanation (spec §6.10).
 */
const NO_EXPLANATIONS: ExplanationSet = {
  'base-rate': null,
  'all-in': null,
  'first-month': null,
  'monthly-gap': null,
  runway: null,
  'break-even': null,
  split: null,
  ledger: null,
  sensitivity: null,
  'facility-fit': null,
};

interface Props {
  fragment: string;
  onDiscard: () => void;
}

function formatSharedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'an unknown date';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Opens a shared family link (spec §11.6): a passphrase gate, then a
 * read-only view of the sender's snapshot. There is deliberately no path
 * from here back into the viewer's own editable plan — merging would need a
 * `Plan -> PlannerState` projection the app has never designed, and §4.1
 * already documents that projection as lossy in the other direction.
 */
export function SharedPlanView({ fragment, onDiscard }: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [payload, setPayload] = useState<SharedPlanPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await decodePlanFromShare(fragment, passphrase);
    setBusy(false);
    if (!result.ok) {
      setError(
        'That passphrase did not open this link. Check it with whoever sent it and try again.',
      );
      return;
    }
    setPayload(result.payload);
  };

  if (!payload) {
    return (
      <main className="page">
        <section className="card" aria-labelledby="shared-gate-heading">
          <h2 id="shared-gate-heading">A family member shared a plan with you</h2>
          <p>
            This link carries an encrypted snapshot of someone else&apos;s plan. Enter the
            passphrase they gave you — separately from the link itself — to open it.
          </p>
          <form onSubmit={onOpen}>
            <label htmlFor="shared-passphrase">Passphrase</label>
            <input
              id="shared-passphrase"
              type="password"
              autoComplete="off"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              data-testid="shared-passphrase"
            />
            {error ? (
              <p className="callout" role="alert" data-testid="shared-error">
                {error}
              </p>
            ) : null}
            <p>
              <button type="submit" disabled={busy} data-testid="shared-open">
                {busy ? 'Opening…' : 'Open plan'}
              </button>{' '}
              <button type="button" className="secondary" onClick={onDiscard}>
                Use my own plan instead
              </button>
            </p>
          </form>
        </section>
      </main>
    );
  }

  const { plan, createdAt, createdBy } = payload;
  const result = computePlan(plan);
  const breakEven = computeBreakEvenForPlan(plan);

  return (
    <ExplainProvider explanations={NO_EXPLANATIONS}>
      <main className="page">
        <section
          className="card callout"
          aria-labelledby="shared-banner-heading"
          data-testid="shared-banner"
        >
          <h2 id="shared-banner-heading">
            You are viewing a shared snapshot{createdBy ? ` from ${createdBy}` : ''}
          </h2>
          <p>
            Made on {formatSharedDate(createdAt)}.{' '}
            <strong>This is a snapshot, not a live sync</strong> — it will not update if the
            sender changes their plan, and nothing entered here goes back to them. Ask for a new
            link when the numbers need to change.
          </p>
          <p>
            <button type="button" className="secondary" onClick={onDiscard}>
              Use my own plan instead
            </button>
          </p>
        </section>

        {result.active ? (
          <ResultsPanel
            result={result.active}
            breakEven={breakEven}
            split={result.split}
            careRecipientLabel={plan.careRecipientLabel}
          />
        ) : (
          <p className="callout">This snapshot has no active care scenario to show.</p>
        )}

        {result.split ? (
          <section className="card" aria-labelledby="shared-split-heading">
            <h2 id="shared-split-heading">How the cost is split</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Contributor</th>
                    <th scope="col" className="num">
                      Monthly share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.split.shares.map((share) => (
                    <tr key={share.contributorId}>
                      <th scope="row">{share.name}</th>
                      <td className="num">{formatCents(share.monthlyCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </ExplainProvider>
  );
}
