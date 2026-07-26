'use client';

import type { PlannerState } from '@/lib/plannerState';
import { TYPICAL_FEE_RANGES, FEE_RANGE_SOURCE, ANNUAL_ESCALATOR_BAND } from '@/lib/data/feeStructures';
import { formatCents, formatPercent } from '@/lib/format';
import { CurrencyInput, NumberInput } from './Inputs';

interface Props {
  state: PlannerState;
  isResidential: boolean;
  isHourly: boolean;
  onChange: (patch: Partial<PlannerState>) => void;
}

/**
 * Progressive refinement. Everything here is optional — the triage answer stands
 * on its own, and this only sharpens it (spec §5.1).
 */
export function RefineCostPanel({ state, isResidential, isHourly, onChange }: Props) {
  return (
    <section className="card" aria-labelledby="refine-heading">
      <h2 id="refine-heading">Make the cost more accurate</h2>
      <p>
        The advertised rate is rarely the final bill. Adding what is known below moves the
        estimate from a median toward this family&rsquo;s actual situation.
      </p>

      <div className="grid">
        <CurrencyInput
          label="Quoted monthly price, if there is one"
          hint="A real quote from a real provider beats any median. Leave blank to use published figures."
          valueCents={state.costOverrideCents ?? 0}
          onChangeCents={(cents) => onChange({ costOverrideCents: cents > 0 ? cents : null })}
        />

        {isHourly ? (
          <NumberInput
            label="Paid hours per week"
            value={state.hoursPerWeek}
            min={0}
            max={168}
            onChange={(v) => onChange({ hoursPerWeek: v })}
          />
        ) : null}

        <CurrencyInput
          label="Medications, supplies and transport"
          hint="Monthly, beyond what the provider bills."
          valueCents={state.ancillaryMonthlyCents}
          onChangeCents={(cents) => onChange({ ancillaryMonthlyCents: cents })}
        />
      </div>

      {isResidential ? (
        <>
          <h3>Fees that are usually not on the brochure</h3>
          <div className="grid">
            <CurrencyInput
              label="Care-level surcharge, monthly"
              hint="Most communities price care in tiers on top of rent, typically $500–$2,000 per level."
              valueCents={state.careLevelTierCents}
              onChangeCents={(cents) => onChange({ careLevelTierCents: cents })}
            />
            <CurrencyInput
              label="Community or move-in fee, one-time"
              hint="Commonly $1,000–$5,000 and usually non-refundable."
              valueCents={state.communityFeeCents}
              onChangeCents={(cents) => onChange({ communityFeeCents: cents })}
            />
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: '1rem 0 0' }}>
            <legend style={{ fontWeight: 700, padding: 0 }}>Services billed separately</legend>
            {state.addOns.map((addOn, i) => (
              <div key={addOn.id}>
                <label htmlFor={`addon-${addOn.id}`} style={{ fontWeight: 400 }}>
                  <input
                    id={`addon-${addOn.id}`}
                    type="checkbox"
                    checked={addOn.enabled}
                    onChange={(e) => {
                      const next = state.addOns.map((a, j) =>
                        j === i ? { ...a, enabled: e.target.checked } : a,
                      );
                      onChange({ addOns: next });
                    }}
                  />{' '}
                  {addOn.label} — about {formatCents(addOn.monthlyCents)} a month
                </label>
              </div>
            ))}
          </fieldset>

          <h3>Annual rate increases</h3>
          <p className="hint">
            Communities commonly raise rates {formatPercent(ANNUAL_ESCALATOR_BAND.low)}–
            {formatPercent(ANNUAL_ESCALATOR_BAND.high)} a year. It compounds, and it is the
            quietest reason a plan runs out earlier than expected.
          </p>
          <NumberInput
            label="Assumed annual increase, percent"
            value={Math.round(state.annualEscalatorRate * 1000) / 10}
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => onChange({ annualEscalatorRate: v / 100 })}
          />

          <details>
            <summary>Typical fee ranges to check a contract against</summary>
            <div className="details-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Fee</th>
                      <th scope="col" className="num">Typical range</th>
                      <th scope="col">What it is</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TYPICAL_FEE_RANGES.map((r) => (
                      <tr key={r.id}>
                        <th scope="row">{r.label}</th>
                        <td className="num">
                          {formatCents(r.lowCents)}–{formatCents(r.highCents)}
                          {r.cadence === 'monthly' ? '/mo' : ' once'}
                        </td>
                        <td>{r.explanation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="provenance">
                {FEE_RANGE_SOURCE.description} Retrieved {FEE_RANGE_SOURCE.retrievedOn}. These are
                ranges for checking a real contract, not quoted prices.
              </p>
            </div>
          </details>
        </>
      ) : null}

      <h3>Projection assumptions</h3>
      <div className="grid">
        <NumberInput
          label="Years to project"
          value={state.projectionYears}
          min={1}
          max={30}
          onChange={(v) => onChange({ projectionYears: v })}
        />
        <NumberInput
          label="Investment return on savings, percent"
          value={Math.round(state.assetReturnRate * 1000) / 10}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => onChange({ assetReturnRate: v / 100 })}
        />
        <NumberInput
          label="Annual rise in income, percent"
          value={Math.round(state.incomeColaRate * 1000) / 10}
          min={0}
          max={20}
          step={0.5}
          onChange={(v) => onChange({ incomeColaRate: v / 100 })}
        />
      </div>
    </section>
  );
}
