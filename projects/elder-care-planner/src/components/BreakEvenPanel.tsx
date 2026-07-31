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

/**
 * The itemised home-cost lines (spec §11.12), in the order they appear.
 *
 * Keyed by the `PlannerState` field so the panel cannot wire a label to the
 * wrong figure, and declared once so the inputs and the total are driven by the
 * same list — a category added to one and not the other would be silently
 * excluded from the sum.
 */
export const HOME_COST_LINES = [
  { key: 'homeMortgageOrRentCents', label: 'Mortgage or rent' },
  { key: 'homeGroceriesCents', label: 'Food and groceries' },
  { key: 'homeUtilitiesCents', label: 'Utilities' },
  { key: 'homePropertyTaxMonthlyCents', label: 'Property tax, monthly share' },
  { key: 'homeInsuranceMonthlyCents', label: 'Home insurance, monthly share' },
  { key: 'homeMaintenanceMonthlyCents', label: 'Upkeep and repairs' },
  { key: 'homeTransportCents', label: 'Transport' },
] as const;

export type HomeCostKey = (typeof HOME_COST_LINES)[number]['key'];

interface Props {
  result: BreakEvenResult;
  hoursPerWeek: number;
  housingCarryMonthlyCents: number;
  hourlyRateCents: number;
  /** The itemised lines, by `PlannerState` field name (spec §11.12). */
  homeCosts: Record<HomeCostKey, number>;
  onHoursChange: (hours: number) => void;
  onHousingCarryChange: (cents: number) => void;
  onHomeCostChange: (key: HomeCostKey, cents: number) => void;
}

export function BreakEvenPanel({
  result,
  hoursPerWeek,
  housingCarryMonthlyCents,
  hourlyRateCents,
  homeCosts,
  onHoursChange,
  onHousingCarryChange,
  onHomeCostChange,
}: Props) {
  // The displayed total is derived from the same lines the inputs write to,
  // never typed separately (spec §11.12). Two boxes that must agree is a defect
  // waiting to happen — §6 "One Fact Stated Twice Will Eventually Be Stated
  // Two Ways".
  const homeCostTotalCents =
    HOME_COST_LINES.reduce((sum, { key }) => sum + homeCosts[key], 0) + housingCarryMonthlyCents;
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
          label="Monthly cost of running the home, not itemised below"
          hint="Anything not broken out in the categories below. Residential care already includes room and board, so leaving the home side at zero flatters staying at home."
          valueCents={housingCarryMonthlyCents}
          onChangeCents={onHousingCarryChange}
        />
      </div>

      {/* Spec §11.12: per-category entry. Nothing here is estimated, suggested
          or pre-filled — every line stays at zero until a person types into it.
          Supplying figures is §11.7's job and §11.7 is still unbuilt. */}
      <details data-print-open data-testid="home-cost-breakdown">
        <summary>Break the home costs down by category (optional)</summary>
        <p className="hint">
          For families who have these figures to hand. Leave any line blank and it counts as zero —
          partial entry is fine.
        </p>
        <div className="grid">
          {HOME_COST_LINES.map(({ key, label }) => (
            <CurrencyInput
              key={key}
              label={label}
              valueCents={homeCosts[key]}
              onChangeCents={(cents) => onHomeCostChange(key, cents)}
            />
          ))}
        </div>
        <p className="hint section-status" data-testid="home-cost-total">
          Total monthly cost of running the home: {formatCents(homeCostTotalCents)}
        </p>
      </details>

      <p className="hint">
        Cost is one input among several. Safety, supervision needs and isolation are not modelled
        here, and they often matter more than the money.
      </p>
    </CollapsibleCard>
  );
}
