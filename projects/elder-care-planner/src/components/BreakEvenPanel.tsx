'use client';

import type { BreakEvenResult } from '@/lib/engine/breakeven';
import { formatCents } from '@/lib/format';
import { NumberInput, CurrencyInput } from './Inputs';
import { WhyButton } from './WhyButton';
import { CollapsibleCard } from './CollapsibleCard';
import { BreakEvenSlider } from './BreakEvenSlider';
import {
  resolveCitedBreakEvenBand,
  breakEvenBandInputFrom,
} from '@/lib/engine/citedBreakEvenBand';
import { buildCrossoverSummary } from '@/lib/breakEvenHeadline';

interface Props {
  result: BreakEvenResult;
  hoursPerWeek: number;
  housingCarryMonthlyCents: number;
  hourlyRateCents: number;
  onHoursChange: (hours: number) => void;
  onHousingCarryChange: (cents: number) => void;
}

export function BreakEvenPanel({
  result,
  hoursPerWeek,
  housingCarryMonthlyCents,
  hourlyRateCents,
  onHoursChange,
  onHousingCarryChange,
}: Props) {
  // The band is resolved ONCE here and handed to both consumers — this summary
  // and the slider below. Resolving it in each of them is how the summary came
  // to state a single crossover hour while the slider stated a range.
  const cited = resolveCitedBreakEvenBand(
    breakEvenBandInputFrom(
      hourlyRateCents,
      hoursPerWeek,
      housingCarryMonthlyCents,
      result.inHomeFixedMonthlyCents,
      result.residentialMonthlyCents,
    ),
  );
  const crossoverSummary = buildCrossoverSummary(result, cited.band);

  const cheaper =
    result.cheaperOption === 'in_home'
      ? `Care at home is cheaper by ${formatCents(result.monthlyDifferenceCents)} a month`
      : result.cheaperOption === 'residential'
        ? `Residential care is cheaper by ${formatCents(result.monthlyDifferenceCents)} a month`
        : 'The two cost about the same';

  return (
    <CollapsibleCard
      id="breakeven"
      title="Home or a facility?"
      status={`${cheaper}, at ${hoursPerWeek} hrs/week`}
      noPrint
    >
      {/* The "?" moved out of the heading when this became a disclosure
          section: a button inside a `summary` is a control inside a control,
          and clicking it would toggle the section rather than open the
          derivation. */}
      <p data-testid="breakeven-summary">
        {crossoverSummary}{' '}
        <WhyButton id="break-even" />
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

      <BreakEvenSlider
        result={result}
        cited={cited}
        hoursPerWeek={hoursPerWeek}
        onHoursChange={onHoursChange}
        hourlyRateCents={hourlyRateCents}
        housingCarryMonthlyCents={housingCarryMonthlyCents}
        inHomeFixedMonthlyCents={result.inHomeFixedMonthlyCents}
        residentialMonthlyCents={result.residentialMonthlyCents}
      />

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
    </CollapsibleCard>
  );
}
