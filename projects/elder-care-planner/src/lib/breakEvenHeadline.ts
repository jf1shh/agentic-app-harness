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
    const low = Math.min(band.lowHours, band.highHours);
    const high = Math.max(band.lowHours, band.highHours);
    crossover =
      band.isDegenerate || !Number.isFinite(low) || !Number.isFinite(high)
        ? 'Across the range of hourly rates, the two do not cross within a week’s hours'
        : // §1.1: a range, because the hourly rate is uncertain. A single
          // crossover hour would be a precision the data does not support.
          `Across the range of hourly rates, they cross somewhere between ${
            Math.round(low * 10) / 10
          } and ${Math.round(high * 10) / 10} hours a week`;
  }

  // §11.9: this comparison is one month at current rates, so the sentence must
  // not be readable as a projection.
  return `${atHours}, ${comparison}. ${crossover}, at today’s rates.`;
}
