/**
 * Break-Even Analyzer (spec §6.2).
 *
 * "Home or facility?" is the dominant decision, and it has a real answer: paid
 * in-home help is cheaper below a crossover point and more expensive above it.
 *
 * Published comparisons usually cheat by pricing only the caregiver's hours on
 * the in-home side, while the residential side quietly includes room and board.
 * Staying home does not stop the mortgage, the utilities or the groceries, so
 * this engine loads both sides properly. That is the whole point — an unloaded
 * comparison flatters staying home and sends families to the wrong answer.
 */

export interface BreakEvenInput {
  /** Hourly rate for paid in-home help. */
  readonly hourlyRateCents: number;
  /** Paid hours per week currently planned. */
  readonly currentHoursPerWeek: number;
  /** Monthly cost of keeping the home running (mortgage, utilities, food, ...). */
  readonly housingCarryMonthlyCents: number;
  /** Recurring in-home costs that are not the caregiver (supplies, transport, ...). */
  readonly inHomeAncillaryMonthlyCents: number;
  /** All-in residential monthly cost, room and board included. */
  readonly residentialAllInMonthlyCents: number;
}

export type CheaperOption = 'in_home' | 'residential' | 'equal';

export interface BreakEvenResult {
  /**
   * Paid hours per week at which the two options cost the same. Zero means
   * residential is already cheaper even before any paid help is added.
   */
  readonly breakEvenHoursPerWeek: number;
  readonly inHomeMonthlyCents: number;
  readonly residentialMonthlyCents: number;
  readonly cheaperOption: CheaperOption;
  /** Absolute monthly gap between the two options at the current hours. */
  readonly monthlyDifferenceCents: number;
  /** Fixed in-home costs that apply before a single paid hour. */
  readonly inHomeFixedMonthlyCents: number;
  /** True when residential is cheaper regardless of how few hours are bought. */
  readonly residentialAlwaysCheaper: boolean;
}

/** Weeks per month, used to convert a weekly hour count to a monthly cost. */
const WEEKS_PER_MONTH = 52 / 12;

export function monthlyCostOfHours(hourlyRateCents: number, hoursPerWeek: number): number {
  return Math.round(hourlyRateCents * hoursPerWeek * WEEKS_PER_MONTH);
}

export function computeBreakEven(input: BreakEvenInput): BreakEvenResult {
  const fixed = input.housingCarryMonthlyCents + input.inHomeAncillaryMonthlyCents;
  const inHomeMonthly = fixed + monthlyCostOfHours(input.hourlyRateCents, input.currentHoursPerWeek);
  const residentialMonthly = input.residentialAllInMonthlyCents;

  const costPerHourPerMonth = input.hourlyRateCents * WEEKS_PER_MONTH;

  // Residential is cheaper even at zero paid hours: the crossover is 0, not a
  // negative hour count.
  const residentialAlwaysCheaper = residentialMonthly <= fixed;

  let breakEvenHoursPerWeek: number;
  if (costPerHourPerMonth <= 0) {
    // Free help never crosses over. Reported as unbounded rather than dividing
    // by zero.
    breakEvenHoursPerWeek = residentialAlwaysCheaper ? 0 : Number.POSITIVE_INFINITY;
  } else if (residentialAlwaysCheaper) {
    breakEvenHoursPerWeek = 0;
  } else {
    breakEvenHoursPerWeek = (residentialMonthly - fixed) / costPerHourPerMonth;
  }

  const difference = Math.abs(inHomeMonthly - residentialMonthly);
  let cheaperOption: CheaperOption;
  if (inHomeMonthly < residentialMonthly) cheaperOption = 'in_home';
  else if (inHomeMonthly > residentialMonthly) cheaperOption = 'residential';
  else cheaperOption = 'equal';

  return {
    breakEvenHoursPerWeek,
    inHomeMonthlyCents: inHomeMonthly,
    residentialMonthlyCents: residentialMonthly,
    cheaperOption,
    monthlyDifferenceCents: difference,
    inHomeFixedMonthlyCents: fixed,
    residentialAlwaysCheaper,
  };
}
