'use client';

import type { ILVariantProjection } from '@/lib/engine/buyin';
import type { ILOption } from '@/lib/schemas';
import { MAX_IL_OPTIONS } from '@/lib/plannerState';
import { formatCents } from '@/lib/format';
import { CurrencyInput, NumberInput, TextInput, CheckboxInput } from './Inputs';
import { ILOverlayChart, ILComparisonTable } from './ILOverlayChart';

/**
 * Independent Living comparison (spec §6.5b.4).
 *
 * Rendered as a card in the single-page flow rather than a literal tab — this
 * app has no tab bar, and inventing one for a single panel would sit oddly
 * beside every other section.
 *
 * Income, assets and assumptions are deliberately NOT editable here. They come
 * from the plan and are shared across all options, which is the whole reason
 * the comparison means anything; the panel says so rather than leaving it to
 * be inferred.
 *
 * Voice follows §5.4: no second person anywhere, including the shortfall
 * label. This panel may be read by a sibling who did not build the plan.
 */
export function ILComparisonPanel({
  options,
  projections,
  liquidAssetsCents,
  onChange,
  onAdd,
  onRemove,
}: {
  options: readonly ILOption[];
  projections: readonly ILVariantProjection[];
  liquidAssetsCents: number;
  onChange: (id: string, patch: Partial<ILOption>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const byId = new Map(projections.map((p) => [p.scenarioId, p]));

  return (
    <section className="card no-print" aria-labelledby="il-heading">
      <h2 id="il-heading">Comparing independent living communities</h2>

      <p>
        Independent living contracts usually come in three shapes: a large entry fee that is partly
        refundable on a schedule that shrinks with each year of residence, a smaller entry fee that
        is not refundable at all, or no entry fee and a higher monthly rate. Which is cheapest
        depends entirely on how long the stay turns out to be, so the options are drawn against
        each other over the whole projection rather than compared on a single figure.
      </p>
      <p className="muted">
        Every option below is measured against the same income, savings and assumptions entered
        elsewhere on this page. Nothing here is a published figure — these are the terms of a
        specific contract, and they have to be read off the community’s own paperwork.
      </p>

      {options.length === 0 ? (
        <p className="callout" data-testid="il-empty">
          No independent living options have been entered yet. Adding one asks for its entry fee,
          its refund schedule and its monthly service fee — the three numbers that decide which
          contract is cheaper, and the three a brochure usually separates.
        </p>
      ) : null}

      <div className="il-options">
        {options.map((option) => {
          const projection = byId.get(option.id);
          const shortfallCents = Math.max(0, option.entryCents - liquidAssetsCents);
          const unaffordable = projection ? !projection.isAffordable : false;

          return (
            <div className="il-option" key={option.id} data-testid={`il-option-${option.id}`}>
              <TextInput
                label="What is this option called?"
                value={option.label}
                onChange={(label) => onChange(option.id, { label })}
              />
              <CurrencyInput
                label="Entry fee, paid once on moving in"
                hint="Zero for a rental-only contract with no buy-in."
                valueCents={option.entryCents}
                onChangeCents={(entryCents) => onChange(option.id, { entryCents })}
              />
              <CurrencyInput
                label="Monthly service fee"
                hint="The community’s own published monthly rate for this contract."
                valueCents={option.monthlyServiceCentsRate}
                onChangeCents={(monthlyServiceCentsRate) =>
                  onChange(option.id, { monthlyServiceCentsRate })
                }
              />
              <CheckboxInput
                label="The entry fee is amortized — nothing is refundable"
                hint="Ticking this makes the refund zero at every tenure, whatever the schedule says."
                checked={option.amortized}
                onChange={(amortized) => onChange(option.id, { amortized })}
              />

              {unaffordable ? (
                <p className="callout" data-testid={`il-shortfall-${option.id}`}>
                  <strong>
                    This option’s entry fee is {formatCents(shortfallCents)} above the plan’s liquid
                    assets.
                  </strong>{' '}
                  It is still drawn on the chart, faded, so the comparison stays visible — freeing
                  that amount may or may not be worth it, and that is easier to judge next to the
                  other options than on its own. It cannot be made the plan’s active scenario.
                </p>
              ) : null}

              <fieldset className="il-ladder">
                <legend>Refund schedule</legend>
                {option.amortized ? (
                  <p className="muted">
                    Not applicable — this contract is amortized, so nothing is refunded at any
                    tenure.
                  </p>
                ) : null}
                {option.refundSchedule.length === 0 && !option.amortized ? (
                  <p className="muted">
                    No refund rows. As entered, this contract returns nothing at any tenure.
                  </p>
                ) : null}
                {option.refundSchedule.map((row, i) => (
                  <div className="il-ladder-row" key={i}>
                    <NumberInput
                      label="After how many months?"
                      value={row.tenureMonths}
                      min={0}
                      max={360}
                      step={1}
                      onChange={(tenureMonths) =>
                        onChange(option.id, {
                          refundSchedule: option.refundSchedule.map((r, j) =>
                            j === i ? { ...r, tenureMonths } : r,
                          ),
                        })
                      }
                    />
                    <NumberInput
                      label="Percent refunded"
                      value={row.refundPercent}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(refundPercent) =>
                        onChange(option.id, {
                          refundSchedule: option.refundSchedule.map((r, j) =>
                            j === i ? { ...r, refundPercent } : r,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        onChange(option.id, {
                          refundSchedule: option.refundSchedule.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove this row
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="secondary"
                  data-testid={`il-add-row-${option.id}`}
                  onClick={() =>
                    onChange(option.id, {
                      refundSchedule: [
                        ...option.refundSchedule,
                        { tenureMonths: 12, refundPercent: 0 },
                      ],
                    })
                  }
                >
                  Add a refund row
                </button>
              </fieldset>

              <button
                type="button"
                className="secondary"
                data-testid={`il-remove-${option.id}`}
                onClick={() => onRemove(option.id)}
              >
                Remove {option.label}
              </button>
            </div>
          );
        })}
      </div>

      {options.length < MAX_IL_OPTIONS ? (
        <button type="button" data-testid="il-add-option" onClick={onAdd}>
          Add an option to compare
        </button>
      ) : (
        <p className="muted">
          Three options is the most this comparison holds — beyond that the chart stops being
          readable, which defeats its purpose.
        </p>
      )}

      {projections.length > 0 ? (
        <>
          <h3>Savings remaining, month by month</h3>
          <p>
            The solid part of each option is the savings still available to spend. The shaded band
            above it is what would come back on leaving that month — it shrinks as the refund
            schedule steps down, and it is shown separately because a refund cannot be spent while
            the stay continues.
          </p>
          <ILOverlayChart projections={projections} />
          <ILComparisonTable projections={projections} />
        </>
      ) : null}
    </section>
  );
}
