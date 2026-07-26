'use client';

import { useState } from 'react';
import type { LedgerSummary } from '@/lib/engine/ledger';
import type { Contributor, ExpenseCategory, LedgerEntry } from '@/lib/schemas';
import {
  EXPENSE_CATEGORY_LABELS,
  LIKELY_DEDUCTIBLE_CATEGORIES,
} from '@/lib/data/expenseCategories';
import { formatCents, formatCentsPrecise } from '@/lib/format';
import { makeId } from '@/lib/format';
import { CurrencyInput, DateInput, NumberInput, SelectInput, TextInput, CheckboxInput } from './Inputs';
import { WhyButton } from './WhyButton';

interface Props {
  summary: LedgerSummary;
  entries: readonly LedgerEntry[];
  contributors: readonly Contributor[];
  monthsElapsed: number;
  onMonthsElapsedChange: (months: number) => void;
  onAddEntry: (entry: LedgerEntry) => void;
  onRemoveEntry: (id: string) => void;
}

const CATEGORY_OPTIONS = (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => ({
  value: c,
  label: EXPENSE_CATEGORY_LABELS[c],
}));

/**
 * The contribution ledger (spec §6.6).
 *
 * The research finding behind this screen is blunt: the fight is rarely about
 * whether a parent needs help, it is about who pays. A split settles that only
 * in theory — what settles it in practice is a written record of what was
 * actually paid, kept by the app rather than by whichever sibling is keeping
 * score.
 *
 * Deliberately minimal, per spec §10.5: amount, date, category, who paid. No
 * receipts, no recurring entries.
 */
export function LedgerPanel({
  summary,
  entries,
  contributors,
  monthsElapsed,
  onMonthsElapsedChange,
  onAddEntry,
  onRemoveEntry,
}: Props) {
  const [contributorId, setContributorId] = useState(contributors[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [category, setCategory] = useState<ExpenseCategory>('medication');
  const [note, setNote] = useState('');
  const [deductible, setDeductible] = useState(true);

  const activeContributorId =
    contributors.some((c) => c.id === contributorId) ? contributorId : contributors[0]?.id ?? '';
  const canAdd = activeContributorId !== '' && amountCents > 0 && date !== '';

  const nameFor = (id: string) =>
    contributors.find((c) => c.id === id)?.name ?? 'No longer listed';

  const submit = () => {
    if (!canAdd) return;
    onAddEntry({
      id: makeId('ledger'),
      contributorId: activeContributorId,
      date,
      amountCents,
      category,
      note: note.trim() === '' ? undefined : note.trim(),
      taxDeductibleCandidate: deductible,
    });
    setAmountCents(0);
    setNote('');
  };

  const onCategoryChange = (next: ExpenseCategory) => {
    setCategory(next);
    // A convenience default the family can override. The app never decides a
    // tax position (spec §1.1) — it only pre-ticks the likely cases.
    setDeductible(LIKELY_DEDUCTIBLE_CATEGORIES.includes(next));
  };

  const categoryRows = (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[])
    .map((c) => ({ category: c, cents: summary.byCategory[c] ?? 0 }))
    .filter((r) => r.cents > 0);

  const orphaned = entries.filter((e) => !contributors.some((c) => c.id === e.contributorId));

  return (
    <section className="card" aria-labelledby="ledger-heading">
      <h2 id="ledger-heading">
        What has actually been paid <WhyButton id="ledger" />
      </h2>
      <p>
        The split above is what was agreed. This is what happened. Logging payments as they are
        made turns a running argument into a running total — and the record belongs to the plan,
        not to whichever family member has been keeping score.
      </p>

      {contributors.length === 0 ? (
        <p className="hint">
          Add family members in the sharing section above to start logging what each has paid.
        </p>
      ) : null}

      <div className="grid">
        <NumberInput
          label="Months of care paid for so far"
          hint="Used to work out what each share should have come to by now. Entered rather than taken from today's date, so the figures do not drift between visits."
          value={monthsElapsed}
          min={0}
          max={360}
          onChange={onMonthsElapsedChange}
        />
      </div>

      {contributors.length > 0 ? (
        <>
          <h3>Log a payment</h3>
          <div className="grid">
            <SelectInput
              label="Who paid?"
              value={activeContributorId}
              options={contributors.map((c) => ({ value: c.id, label: c.name }))}
              onChange={setContributorId}
            />
            <DateInput label="When?" value={date} onChange={setDate} />
            <CurrencyInput
              label="How much?"
              valueCents={amountCents}
              onChangeCents={setAmountCents}
            />
            <SelectInput
              label="What for?"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(v) => onCategoryChange(v as ExpenseCategory)}
            />
            <TextInput
              label="Note"
              hint="Optional. A few words — no account numbers."
              value={note}
              maxLength={200}
              placeholder="Pharmacy, refill"
              onChange={setNote}
            />
          </div>
          <CheckboxInput
            label="May count toward unreimbursed medical expenses"
            hint="Totalled for a conversation with a tax professional. This app does not decide tax positions."
            checked={deductible}
            onChange={setDeductible}
          />
          <p className="no-print">
            <button type="button" onClick={submit} disabled={!canAdd} data-testid="add-ledger-entry">
              Add to the ledger
            </button>
            {!canAdd ? (
              <span className="hint">Who paid, when, and how much are all needed.</span>
            ) : null}
          </p>
        </>
      ) : null}

      {entries.length > 0 ? (
        <>
          <h3>Logged payments</h3>
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">Every payment logged, most recent first</caption>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">What for</th>
                  <th scope="col" className="num">Amount</th>
                  <th scope="col" className="no-print">
                    <span className="visually-hidden">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...entries]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((entry) => (
                    <tr key={entry.id} data-testid="ledger-row">
                      <th scope="row">{entry.date}</th>
                      <td>{nameFor(entry.contributorId)}</td>
                      <td>
                        {EXPENSE_CATEGORY_LABELS[entry.category]}
                        {entry.note ? <span className="hint">{entry.note}</span> : null}
                      </td>
                      <td className="num">{formatCentsPrecise(entry.amountCents)}</td>
                      <td className="no-print">
                        <button
                          type="button"
                          className="secondary small"
                          onClick={() => onRemoveEntry(entry.id)}
                          aria-label={`Remove the ${formatCents(entry.amountCents)} payment logged on ${entry.date}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td />
                  <td />
                  <td className="num" data-testid="ledger-total">
                    {formatCentsPrecise(summary.totalPaidCents)}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>

          {orphaned.length > 0 ? (
            <p className="callout">
              {orphaned.length === 1 ? 'One payment is' : `${orphaned.length} payments are`} logged
              against someone no longer listed as sharing the cost. Those payments were still made,
              so they are kept in the total rather than deleted.
            </p>
          ) : null}
        </>
      ) : null}

      {summary.reconciliation.length > 0 ? (
        <>
          <h3>Agreed share against what was paid</h3>
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">
                Each family member&rsquo;s expected contribution compared with what they have paid
              </caption>
              <thead>
                <tr>
                  <th scope="col">Family member</th>
                  <th scope="col" className="num">Share a month</th>
                  <th scope="col" className="num">Expected by now</th>
                  <th scope="col" className="num">Actually paid</th>
                  <th scope="col" className="num">Difference</th>
                </tr>
              </thead>
              <tbody>
                {summary.reconciliation.map((row) => (
                  <tr key={row.contributorId}>
                    <th scope="row">{row.name}</th>
                    <td className="num">{formatCentsPrecise(row.pledgedMonthlyCents)}</td>
                    <td className="num">{formatCentsPrecise(row.expectedToDateCents)}</td>
                    <td className="num" data-testid={`paid-${row.contributorId}`}>
                      {formatCentsPrecise(row.paidTotalCents)}
                    </td>
                    <td className="num" data-testid={`balance-${row.contributorId}`}>
                      {row.balanceCents === 0
                        ? 'Level'
                        : `${formatCentsPrecise(Math.abs(row.balanceCents))} ${
                            row.balanceCents > 0 ? 'ahead' : 'behind'
                          }`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            &ldquo;Expected by now&rdquo; is each share multiplied by the months entered above. A
            difference is a fact about cash, not a judgement about anyone — unpaid care hours and
            the work of coordinating are contributions too, and they are shown in the sharing
            section rather than converted into money here.
          </p>
        </>
      ) : null}

      {categoryRows.length > 0 ? (
        <>
          <h3>What the money went on</h3>
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">Total paid in each category</caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="num">Total paid</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => (
                  <tr key={row.category}>
                    <th scope="row">{EXPENSE_CATEGORY_LABELS[row.category]}</th>
                    <td className="num">{formatCentsPrecise(row.cents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td className="num">{formatCentsPrecise(summary.totalPaidCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {summary.deductibleCandidateCents > 0 ? (
            <p className="callout" data-testid="deductible-candidate">
              {formatCents(summary.deductibleCandidateCents)} of this is marked as possibly counting
              toward unreimbursed medical expenses. That is a total of what was ticked, not a
              determination that any of it is deductible — whether it is depends on income, on
              itemising, and on whether care follows a plan of care. It is worth taking this figure
              to a tax professional rather than acting on it.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
