'use client';

import type { SplitResult } from '@/lib/engine/split';
import type { Contributor, SplitMethod } from '@/lib/schemas';
import { formatCents, formatCentsPrecise } from '@/lib/format';
import { SelectInput, CurrencyInput, NumberInput } from './Inputs';

interface Props {
  split: SplitResult;
  contributors: readonly Contributor[];
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  onContributorChange: (index: number, next: Contributor) => void;
}

export function SplitPanel({
  split,
  contributors,
  method,
  onMethodChange,
  onContributorChange,
}: Props) {
  return (
    <section className="card" aria-labelledby="split-heading">
      <h2 id="split-heading">Sharing the cost</h2>
      <p>
        The gap after income is {formatCents(split.shares.reduce((s, x) => s + x.monthlyCents, 0) + split.unfundedCents)} a
        month. Below is one way to divide it. The figures come from the plan, not from whoever
        raised the subject.
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
          </div>
        ))}
      </div>
    </section>
  );
}
