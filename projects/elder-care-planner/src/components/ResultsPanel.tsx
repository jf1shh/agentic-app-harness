'use client';

import type { ScenarioResult } from '@/lib/engine/plan';
import type { BreakEvenResult } from '@/lib/engine/breakeven';
import type { SplitResult } from '@/lib/engine/split';
import { buildRecommendation } from '@/lib/recommendation';
import { formatCents, formatMonths } from '@/lib/format';
import { COST_DATA_SOURCE } from '@/lib/data/costOfCare';
import { RunwayChart } from './RunwayChart';
import { WhyButton } from './WhyButton';

interface Props {
  result: ScenarioResult;
  breakEven: BreakEvenResult | null;
  split: SplitResult | null;
  careRecipientLabel: string;
}

export function ResultsPanel({ result, breakEven, split, careRecipientLabel }: Props) {
  const { cost, runway, sensitivity } = result;
  const rec = buildRecommendation(result, breakEven, split, careRecipientLabel);

  return (
    <section className="card" aria-labelledby="results-heading">
      <h2 id="results-heading">The answer</h2>

      {/* The decision first, the spreadsheet underneath (spec §5.2). */}
      <div className="headline">
        <p>{rec.headline}</p>
        <span className="big" data-testid="runway-line">
          {rec.runwayLine}
        </span>
        {rec.topDriverLine ? (
          <p data-testid="top-driver">{rec.topDriverLine}</p>
        ) : null}
        <p>
          <strong>{rec.nextAction}</strong>
        </p>
      </div>

      {rec.warnings.map((w) => (
        <p className="callout" key={w}>
          {w}
        </p>
      ))}

      {/* Every figure carries the control that shows how it was reached
          (spec §6.10). A number a family cannot check is a number they have to
          take on faith, and this decision is too expensive for faith. */}
      <div className="grid-narrow">
        <div className="stat">
          <span className="value" data-testid="advertised">
            {formatCents(cost.advertisedBaseCents)}
          </span>
          <span className="label">
            Advertised base rate, monthly <WhyButton id="base-rate" />
          </span>
        </div>
        <div className="stat">
          <span className="value" data-testid="all-in">
            {formatCents(cost.allInMonthlyCents)}
          </span>
          <span className="label">
            Realistic all-in, monthly
            {cost.deltaPercent > 0 ? ` — ${Math.round(cost.deltaPercent)}% higher` : ''}{' '}
            <WhyButton id="all-in" />
          </span>
        </div>
        <div className="stat">
          <span className="value">{formatCents(runway.monthlyShortfallCents)}</span>
          <span className="label">
            Monthly gap after income <WhyButton id="monthly-gap" />
          </span>
        </div>
        <div className="stat">
          <span className="value">{formatMonths(runway.depletionMonth)}</span>
          <span className="label">
            {runway.depletionMonth === null
              ? 'Savings are not projected to run out'
              : 'Until savings run out (mid-range estimate)'}{' '}
            <WhyButton id="runway" />
          </span>
        </div>
      </div>

      {cost.oneTimeCents > 0 ? (
        <div className="grid-narrow">
          <div className="stat">
            <span className="value">{formatCents(cost.firstMonthCents)}</span>
            <span className="label">
              Due in the first month, including one-time costs <WhyButton id="first-month" />
            </span>
          </div>
        </div>
      ) : null}

      <h3>
        What would change this answer <WhyButton id="sensitivity" />
      </h3>
      <p className="hint">
        Each figure below is the difference in how long the money lasts between the low and high
        end of that assumption. Ranges marked as planning assumptions are not survey data.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Assumption</th>
              <th scope="col" className="num">Difference it makes</th>
              <th scope="col">Basis</th>
            </tr>
          </thead>
          <tbody>
            {sensitivity.levers.map((lever) => (
              <tr key={lever.id}>
                <th scope="row">{lever.label}</th>
                <td className="num">
                  {lever.impactMonths === 0 ? 'No effect here' : formatMonths(lever.impactMonths)}
                </td>
                <td>
                  {lever.basis === 'published_range' ? 'Published range' : 'Planning assumption'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>How the money runs down</h3>
      <RunwayChart years={runway.yearlyBreakdown} />

      <p className="provenance">
        Reference figures: {COST_DATA_SOURCE.name}, {COST_DATA_SOURCE.surveyYear} survey (
        {COST_DATA_SOURCE.surveyPeriod}), retrieved {COST_DATA_SOURCE.retrievedOn}.
        {cost.isNationalFallback
          ? ' No verified state-level figure was available, so the national median is used.'
          : ''}
        {cost.usedOverride ? ' A quoted price was entered, which overrides the published median.' : ''}
        {cost.confidence === 'derived'
          ? ' This care type is not separately surveyed; the figure is derived and should be replaced with a real quote.'
          : ''}
        {cost.confidence === 'needs_verification'
          ? ' This figure comes from a secondary summary and has not been checked against the published survey.'
          : ''}
      </p>
    </section>
  );
}
