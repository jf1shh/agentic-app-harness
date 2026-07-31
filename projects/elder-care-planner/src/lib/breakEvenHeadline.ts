/**
 * The live headline sentence on the break-even panel (spec §11.11).
 *
 * The third of the NYT rent-vs-buy calculator's signature elements. The app
 * already had the slider (§11.10) and the exposed, editable assumptions (§6.10
 * derivations); what was missing was the one line that says in words what the
 * chart is showing, and moves as the reader moves it.
 *
 * Built here rather than in JSX for the same reason `lib/recommendation.ts` is:
 * two of the constraints on this sentence are editorial, and an editorial rule
 * living in a comment is a rule nobody runs.
 *
 *  - **§5.4 neutral third-party voice.** No second person, no "you should", no
 *    characterising a family member. When the *app* states the comparison it is
 *    not a relative stating it, and that reframing does real work at a family
 *    meeting.
 *  - **§11.2 states which is cheaper, never which to choose.** That one option
 *    costs less at the selected hours is a fact about arithmetic. Naming a best
 *    option is a recommendation this app declines to make.
 *
 * Every figure is read from `BreakEvenResult` and the §11.10 band. Nothing is
 * recomputed — a headline that disagreed with the chart directly beneath it is
 * the §6 "Explain the Arithmetic Without Re-implementing It" failure in its
 * most visible possible form.
 */

import type { BreakEvenResult } from './engine/breakeven';
import type { BreakEvenBand } from './engine/breakevenBand';
import { formatCents } from './format';

function hoursText(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hours a week`;
}

/**
 * The crossover range, or `null` when the band cannot express one.
 *
 * Exported and shared because the headline and the panel's summary paragraph
 * both state this figure. They previously computed it separately, and the
 * summary's version was a single hour while the headline's was a range — two
 * sentences in one card describing the same crossing in contradictory shapes.
 * One builder means they cannot disagree again.
 */
export function crossoverRangeText(band: BreakEvenBand): string | null {
  const low = Math.min(band.lowHours, band.highHours);
  const high = Math.max(band.lowHours, band.highHours);
  if (band.isDegenerate || !Number.isFinite(low) || !Number.isFinite(high)) return null;
  return `between ${Math.round(low * 10) / 10} and ${Math.round(high * 10) / 10} hours a week`;
}

/**
 * The comparison at the selected hours, in one sentence.
 *
 * `hoursPerWeek` is the *live* slider position rather than the saved plan
 * value, so the sentence tracks the drag (§11.11 acceptance row 2).
 */
export function buildBreakEvenHeadline(
  result: BreakEvenResult,
  band: BreakEvenBand,
  hoursPerWeek: number,
): string {
  const atHours = `At ${hoursText(hoursPerWeek)} of paid help at home`;

  const comparison =
    result.cheaperOption === 'equal'
      ? `care at home and residential care cost about the same — ${formatCents(
          result.inHomeMonthlyCents,
        )} a month against ${formatCents(result.residentialMonthlyCents)}`
      : `care at home costs ${formatCents(
          result.inHomeMonthlyCents,
        )} a month against ${formatCents(result.residentialMonthlyCents)} for residential care, a difference of ${formatCents(
          result.monthlyDifferenceCents,
        )}`;

  // The crossover clause. Three cases, and only the first states a range.
  //
  // `residentialAlwaysCheaper` is not "the crossover is at zero hours" — it is
  // that there is no crossing at all, because the cost of running the home
  // already exceeds the facility rate before a single paid hour. Reporting a
  // crossover of 0 would describe an intersection the curves never make.
  let crossover: string;
  if (result.residentialAlwaysCheaper) {
    crossover =
      'Residential care is already the cheaper of the two before any paid help is added, so the two never cross';
  } else {
    // §1.1: a range, because the hourly rate is uncertain. A single crossover
    // hour would be a precision the data does not support.
    const range = crossoverRangeText(band);
    crossover =
      range === null
        ? 'Across the range of hourly rates, the two do not cross within a week’s hours'
        : `Across the range of hourly rates, they cross somewhere ${range}`;
  }

  // §11.9: this comparison is one month at current rates, so the sentence must
  // not be readable as a projection.
  return `${atHours}, ${comparison}. ${crossover}, at today’s rates.`;
}

/**
 * The panel's summary paragraph (spec §11.11).
 *
 * Replaces the sentence "The two options cost the same at 38.5 hours a week of
 * paid help" — a point estimate, which §1.1 refuses where a range is the honest
 * answer, and which sat directly above a headline and a slider status line that
 * both correctly stated a band. The crossover figure comes from the same
 * `crossoverRangeText` the headline uses, so the two cannot diverge again.
 */
export function buildCrossoverSummary(result: BreakEvenResult, band: BreakEvenBand): string {
  if (result.residentialAlwaysCheaper) {
    return (
      'Residential care is cheaper here even before any paid help at home is added, because the '
      + 'cost of running the home already exceeds the facility rate.'
    );
  }

  const range = crossoverRangeText(band);
  if (range === null) {
    return (
      'Across the range of hourly rates shown, the two options do not cross '
      + 'within a week’s hours.'
    );
  }

  return (
    `Across the range of hourly rates shown, the two options cost the same ${range} `
    + 'of paid help. Below that, care at home is cheaper; above it, residential care is.'
  );
}
