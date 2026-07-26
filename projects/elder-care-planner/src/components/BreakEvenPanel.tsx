'use client';

import type { BreakEvenResult } from '@/lib/engine/breakeven';
import { formatCents } from '@/lib/format';
import { NumberInput, CurrencyInput } from './Inputs';

interface Props {
  result: BreakEvenResult;
  hoursPerWeek: number;
  housingCarryMonthlyCents: number;
  onHoursChange: (hours: number) => void;
  onHousingCarryChange: (cents: number) => void;
}

export function BreakEvenPanel({
  result,
  hoursPerWeek,
  housingCarryMonthlyCents,
  onHoursChange,
  onHousingCarryChange,
}: Props) {
  const crossover = Number.isFinite(result.breakEvenHoursPerWeek)
    ? `${Math.round(result.breakEvenHoursPerWeek * 10) / 10} hours a week`
    : 'never, at a zero hourly rate';

  return (
    <section className="card" aria-labelledby="breakeven-heading">
      <h2 id="breakeven-heading">Home or a facility?</h2>
      <p data-testid="breakeven-summary">
        {result.residentialAlwaysCheaper
          ? 'Residential care is cheaper here even before any paid help at home is added, because the cost of running the home already exceeds the facility rate.'
          : `The two options cost the same at ${crossover} of paid help. Below that, care at home is cheaper; above it, residential care is.`}
      </p>

      <div className="grid-narrow">
        <div className="stat">
          <span className="value" data-testid="in-home-monthly">
            {formatCents(result.inHomeMonthlyCents)}
          </span>
          <span className="label">Care at home, monthly, fully loaded</span>
        </div>
        <div className="stat">
          <span className="value" data-testid="residential-monthly">
            {formatCents(result.residentialMonthlyCents)}
          </span>
          <span className="label">Residential care, monthly, all-in</span>
        </div>
        <div className="stat">
          <span className="value" data-testid="cheaper-option">
            {result.cheaperOption === 'in_home'
              ? 'Care at home'
              : result.cheaperOption === 'residential'
                ? 'Residential care'
                : 'About the same'}
          </span>
          <span className="label">
            Cheaper at {hoursPerWeek} hrs/week, by {formatCents(result.monthlyDifferenceCents)}
          </span>
        </div>
      </div>

      <div className="grid">
        <NumberInput
          label="Paid help at home, hours per week"
          value={hoursPerWeek}
          min={0}
          max={168}
          onChange={onHoursChange}
        />
        <CurrencyInput
          label="Monthly cost of running the home"
          hint="Mortgage or rent, utilities, taxes, insurance, food, upkeep. Residential care already includes room and board, so leaving this at zero flatters staying at home."
          valueCents={housingCarryMonthlyCents}
          onChangeCents={onHousingCarryChange}
        />
      </div>

      <p className="hint">
        Cost is one input among several. Safety, supervision needs and isolation are not modelled
        here, and they often matter more than the money.
      </p>
    </section>
  );
}
