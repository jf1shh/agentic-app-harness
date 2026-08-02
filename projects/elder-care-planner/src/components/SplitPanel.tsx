'use client';

import type { SplitResult } from '@/lib/engine/split';
import type { CareCoverageSlot, Contributor, SplitMethod } from '@/lib/schemas';
import { formatCents, formatCentsPrecise } from '@/lib/format';
import { coveredHoursForContributor } from '@/lib/careCoverage';
import { SelectInput, CurrencyInput, NumberInput } from './Inputs';
import { WhyButton } from './WhyButton';
import { CollapsibleCard } from './CollapsibleCard';
import { CareCoverageGrid } from './CareCoverageGrid';

const METHOD_LABELS: Record<SplitMethod, string> = {
  equal: 'Equally',
  income_proportional: 'In proportion to income',
  custom: 'By what each has offered',
};

interface Props {
  split: SplitResult;
  contributors: readonly Contributor[];
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  onContributorChange: (index: number, next: Contributor) => void;
  coverage: readonly CareCoverageSlot[];
  onCoverageChange: (next: readonly CareCoverageSlot[]) => void;
}

export function SplitPanel({
  split,
  contributors,
  method,
  onMethodChange,
  onContributorChange,
  coverage,
  onCoverageChange,
}: Props) {
  // Read off the same `SplitResult` the table below renders, so the closed
  // section and the open one cannot state different figures (spec §5.1a).
  const gapCents = split.shares.reduce((s, x) => s + x.monthlyCents, 0) + split.unfundedCents;

  return (
    <CollapsibleCard
      id="split"
      title="Sharing the cost"
      status={`${METHOD_LABELS[method]} — ${split.shares.length} sharing ${formatCents(gapCents)} a month`}
    >
      <p>
        The gap after income is {formatCents(gapCents)} a month. Below is one way to divide it. The
        figures come from the plan, not from whoever raised the subject. <WhyButton id="split" />
      </p>

      <div className="grid">
        <SelectInput
          label="How should the cost be divided?"
          value={method}
          options={[
            { value: 'equal', label: 'Equally' },
            { value: 'income_proportional', label: 'In proportion to income' },
            { value: 'custom', label: 'By what each has offered' },
          ]}
          onChange={(v) => onMethodChange(v as SplitMethod)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Monthly contribution by family member</caption>
          <thead>
            <tr>
              <th scope="col">Family member</th>
              <th scope="col" className="num">Monthly share</th>
              <th scope="col" className="num">Unpaid care hours</th>
              <th scope="col" className="num">Value of that care</th>
            </tr>
          </thead>
          <tbody>
            {split.shares.map((share) => (
              <tr key={share.contributorId}>
                <th scope="row">{share.name}</th>
                {/* Shown to the cent, not rounded to dollars: this is the one
                    table where the parts must visibly add up to the total, and
                    a family that spots a missing dollar stops trusting the
                    whole plan. */}
                <td className="num" data-testid={`share-${share.contributorId}`}>
                  {formatCentsPrecise(share.monthlyCents)}
                  {share.exceedsCapacity ? ' (above stated capacity)' : ''}
                </td>
                <td className="num">{share.unpaidHoursPerWeek || 0}</td>
                <td className="num">{formatCents(share.unpaidHoursValueCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num" data-testid="split-total">
                {formatCentsPrecise(split.totalCents)}
              </td>
              <td className="num" />
              <td className="num" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="hint">
        Unpaid care hours are valued at the local aide rate and shown alongside cash. They are
        deliberately not subtracted from anyone&rsquo;s share — how to weigh time against money is
        a decision for the family, not for this app.
      </p>

      <h3>Weekly coverage pattern (optional)</h3>
      <p className="hint">
        Lay out who is typically around for each part of a usual week. This is a pattern, not a
        calendar — no dates, no reminders. It offers a starting figure for each person&rsquo;s
        unpaid care hours below, so that number is something a family can check rather than a
        guess typed once and never revisited.
      </p>
      <CareCoverageGrid coverage={coverage} contributors={contributors} onChange={onCoverageChange} />

      <h3>Details for each family member</h3>
      <div className="grid">
        {contributors.map((c, i) => (
          <div key={c.id}>
            <label htmlFor={`name-${c.id}`}>
              Name or label
              <span className="hint">A first name or &ldquo;my brother&rdquo; is enough.</span>
            </label>
            <input
              id={`name-${c.id}`}
              type="text"
              value={c.name}
              onChange={(e) => onContributorChange(i, { ...c, name: e.target.value })}
            />
            {method === 'income_proportional' ? (
              <CurrencyInput
                label="Annual income"
                hint="Used only to work out proportions."
                valueCents={c.annualIncomeCents ?? 0}
                onChangeCents={(cents) =>
                  onContributorChange(i, { ...c, annualIncomeCents: cents || undefined })
                }
              />
            ) : null}
            {method === 'custom' ? (
              <CurrencyInput
                label="Offered per month"
                valueCents={c.monthlyPledgeCents ?? 0}
                onChangeCents={(cents) =>
                  onContributorChange(i, { ...c, monthlyPledgeCents: cents || undefined })
                }
              />
            ) : null}
            <CurrencyInput
              label="Can afford per month"
              hint="Optional. Used to flag when a share would mean borrowing."
              valueCents={c.monthlyCapacityCents ?? 0}
              onChangeCents={(cents) =>
                onContributorChange(i, { ...c, monthlyCapacityCents: cents || undefined })
              }
            />
            <NumberInput
              label="Unpaid care hours per week"
              value={c.providesUnpaidHoursPerWeek}
              min={0}
              max={168}
              onChange={(v) => onContributorChange(i, { ...c, providesUnpaidHoursPerWeek: v })}
            />
            {(() => {
              const suggested = coveredHoursForContributor(coverage, c.id);
              // Never a silent overwrite (spec §11.12's precedent): shown only
              // when it would change something, and only applied on request.
              if (suggested === 0 || suggested === c.providesUnpaidHoursPerWeek) return null;
              return (
                <p className="hint" data-testid={`coverage-suggestion-${c.id}`}>
                  The coverage pattern above adds up to {suggested} hrs/week for {c.name}.{' '}
                  <button
                    type="button"
                    className="secondary small"
                    onClick={() =>
                      onContributorChange(i, { ...c, providesUnpaidHoursPerWeek: suggested })
                    }
                  >
                    Use {suggested} hrs/week
                  </button>
                </p>
              );
            })()}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
