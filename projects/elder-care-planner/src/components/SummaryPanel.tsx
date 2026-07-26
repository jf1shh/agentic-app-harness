'use client';

import type { ScenarioResult } from '@/lib/engine/plan';
import type { SplitResult } from '@/lib/engine/split';
import type { BreakEvenResult } from '@/lib/engine/breakeven';
import { buildRecommendation } from '@/lib/recommendation';
import { formatCents, formatCentsPrecise, formatPercent } from '@/lib/format';
import { CARE_TYPE_LABELS, COST_DATA_SOURCE } from '@/lib/data/costOfCare';
import type { PlannerState } from '@/lib/plannerState';

interface Props {
  result: ScenarioResult;
  split: SplitResult | null;
  breakEven: BreakEvenResult | null;
  state: PlannerState;
}

/**
 * The document a family brings to the conversation.
 *
 * Written in a neutral third-party register on purpose (spec §5.4): no second
 * person, no "you should", nothing that characterises a family member. Every
 * assumption is printed so the argument can be about the inputs rather than
 * about each other.
 */
export function SummaryPanel({ result, split, breakEven, state }: Props) {
  const rec = buildRecommendation(result, breakEven, split, state.careRecipientLabel);
  const { cost, runway } = result;

  return (
    <section className="card" aria-labelledby="summary-heading">
      <h2 id="summary-heading">Summary for a family conversation</h2>

      <p>{rec.headline}</p>
      <p>{rec.runwayLine}</p>
      <p>{rec.nextAction}</p>

      <h3>The figures</h3>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th scope="row">Type of care</th>
              <td>{CARE_TYPE_LABELS[state.careType]}</td>
            </tr>
            <tr>
              <th scope="row">Advertised base rate</th>
              <td>{formatCents(cost.advertisedBaseCents)} a month</td>
            </tr>
            <tr>
              <th scope="row">Realistic all-in cost</th>
              <td>{formatCents(cost.allInMonthlyCents)} a month</td>
            </tr>
            <tr>
              <th scope="row">First month, with one-time costs</th>
              <td>{formatCents(cost.firstMonthCents)}</td>
            </tr>
            <tr>
              <th scope="row">Income available</th>
              <td>{formatCents(state.monthlyIncomeCents)} a month</td>
            </tr>
            <tr>
              <th scope="row">Gap to be funded</th>
              <td>{formatCents(runway.monthlyShortfallCents)} a month</td>
            </tr>
            <tr>
              <th scope="row">Savings available</th>
              <td>{formatCents(state.liquidAssetsCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {split && split.shares.length > 0 ? (
        <>
          <h3>Proposed contributions</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Family member</th>
                  <th scope="col" className="num">Monthly</th>
                  <th scope="col" className="num">Unpaid care hours a week</th>
                </tr>
              </thead>
              <tbody>
                {split.shares.map((s) => (
                  <tr key={s.contributorId}>
                    <th scope="row">{s.name}</th>
                    <td className="num">{formatCentsPrecise(s.monthlyCents)}</td>
                    <td className="num">{s.unpaidHoursPerWeek || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h3>Assumptions behind these figures</h3>
      <ul>
        <li>
          Costs {state.costOverrideCents ? 'use a quoted price supplied by the family' : `use published medians from the ${COST_DATA_SOURCE.name}, ${COST_DATA_SOURCE.surveyYear} survey`}
          .
        </li>
        <li>Care costs are assumed to rise {formatPercent(state.annualEscalatorRate, 1)} a year.</li>
        <li>Income is assumed to rise {formatPercent(state.incomeColaRate, 1)} a year.</li>
        <li>Savings are assumed to return {formatPercent(state.assetReturnRate, 1)} a year.</li>
        <li>The projection runs for {state.projectionYears} years.</li>
        <li>
          Public benefits are not counted as income here, and Medicare is assumed to contribute
          nothing toward long-term custodial care.
        </li>
      </ul>

      <p className="provenance">
        These are estimates produced by a planning tool, not financial, legal, tax or medical
        advice. Medicaid eligibility and tax positions are deliberately not modelled.
      </p>
    </section>
  );
}
