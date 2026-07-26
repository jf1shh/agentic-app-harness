'use client';

import type { Explanation, ExplainStep } from '@/lib/explain/types';
import { formatCentsPrecise } from '@/lib/format';

const SIGN: Partial<Record<ExplainStep['kind'], string>> = {
  add: '+',
  subtract: '−',
  result: '=',
};

function amountText(step: ExplainStep): string {
  if (step.valueText !== undefined) return step.valueText;
  if (step.valueCents === undefined) return '';
  // Parts and totals are formatted identically, to the cent. A derivation whose
  // displayed parts do not add to its displayed total fails the exact check the
  // panel invited the reader to perform (.agents/AGENTS.md §6).
  const sign = SIGN[step.kind];
  return sign ? `${sign} ${formatCentsPrecise(step.valueCents)}` : formatCentsPrecise(step.valueCents);
}

/**
 * One derivation, rendered. Used both inside the side panel and in the
 * permanent methodology section, so the two can never drift apart.
 */
export function ExplanationBody({ explanation }: { explanation: Explanation }) {
  return (
    <div className="explanation">
      <p>{explanation.plainLanguage}</p>

      <p className="formula">
        <span className="visually-hidden">The formula: </span>
        {explanation.formula}
      </p>

      <div className="table-wrap">
        <table className="derivation">
          <caption className="visually-hidden">
            Step by step working for {explanation.title.toLowerCase()}
          </caption>
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col" className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {explanation.steps.map((step, i) =>
              step.kind === 'note' ? (
                <tr key={`${explanation.id}-${i}`} className="step-note">
                  <td colSpan={2}>{step.label}</td>
                </tr>
              ) : (
                <tr
                  key={`${explanation.id}-${i}`}
                  className={step.kind === 'result' ? 'step-result' : undefined}
                >
                  <th scope="row">
                    {step.label}
                    {step.workingOut ? <span className="hint">{step.workingOut}</span> : null}
                  </th>
                  <td className="num">{amountText(step)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {explanation.assumptions.length > 0 ? (
        <>
          <h3>Assumptions applied</h3>
          <ul className="checklist">
            {explanation.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      ) : null}

      {explanation.caveats.length > 0 ? (
        <>
          <h3>What this figure cannot tell anyone</h3>
          <ul className="checklist">
            {explanation.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : null}

      {explanation.sources.length > 0 ? (
        <>
          <h3>Where the numbers come from</h3>
          {explanation.sources.map((s) => (
            <p className="provenance" key={s}>
              {s}
            </p>
          ))}
        </>
      ) : null}
    </div>
  );
}
