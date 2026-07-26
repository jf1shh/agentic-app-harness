/**
 * Buy-in & refund engine — Independent Living community comparisons (spec §6.5b).
 *
 * Pure functions only. No React, no storage, no ambient clock. Reuses
 * `computeCost` and `buildRunwayInput` / `computeRunway` so the buy-in math
 * agrees with the existing all-in and runway engines. Refund value is NOT
 * routed through `IncomeSource` because that would mis-apply COLA and LTC
 * elimination logic — refund is a one-time asset inflow at exit, not a
 * monthly income stream.
 */
import type { BuyInContract, CareScenario, Plan } from '../schemas';
import { buyInContractFor, computeCost } from './cost';
import { buildRunwayInput } from './plan';
import { computeRunway } from './runway';

/**
 * The refund the family receives at exit with the given `tenureMonths`
 * of residence, derived from `contract.refundSchedule`. The schedule is
 * applied as the largest-tenure entry whose `tenureMonths` is ≤ the family's
 * current tenure. Below the first bracket refund is 0; at or beyond the
 * last bracket the last row's percent applies. Cents, not floats, per the
 * money-as-cents discipline.
 *
 * Hand-computed fixture (test/buyin.test.ts):
 *   contract = {
 *     entryCents: 40_000_000,
 *     refundSchedule: [
 *       { tenureMonths: 12, refundPercent: 80 },
 *       { tenureMonths: 36, refundPercent: 60 },
 *       { tenureMonths: 60, refundPercent: 30 },
 *       { tenureMonths: 84, refundPercent:  0 },
 *     ],
 *   }
 *   resolveRefundAtTenure(contract, 37)   === 24_000_000   (60% of $400k)
 *   resolveRefundAtTenure(contract, 11)   ===  0          (below first bracket)
 *   resolveRefundAtTenure(contract, 60)   === 12_000_000   (30% of $400k)
 *   resolveRefundAtTenure(contract, 84)   ===  0          (terminal 0% bracket)
 */
export function resolveRefundAtTenure(
  contract: BuyInContract,
  tenureMonths: number,
): number {
  if (contract.amortized) return 0;
  if (contract.refundSchedule.length === 0) return 0;
  // Defensive sort: the spec asks for ascending-by-tenureMonths, but a
  // hand-typed schedule could be out of order. The engine must still produce
  // the correct result either way.
  const sorted = [...contract.refundSchedule].sort(
    (a, b) => a.tenureMonths - b.tenureMonths,
  );
  let refundPercent = 0;
  for (const entry of sorted) {
    if (tenureMonths >= entry.tenureMonths) {
      refundPercent = entry.refundPercent;
    } else {
      break;
    }
  }
  return Math.floor((contract.entryCents * refundPercent) / 100);
}

export interface AffordabilityResult {
  readonly entryCents: number;
  readonly liquidAssetsCents: number;
  readonly affordable: boolean;
  readonly shortfallCents: number;
}

/**
 * Whether the family can pay the community's entry fee on day one out of
 * liquid assets. IL option with `affordable: false` is hard-blocked in the
 * UI per the user's decision; the on-screen explainer names the shortfall
 * to the cent and points at the next action (reduce entry, raise assets,
 * or remove the option).
 */
export function buyInAffordability(
  liquidAssetsCents: number,
  contract: BuyInContract,
): AffordabilityResult {
  const entryCents = contract.entryCents;
  const shortfallCents = Math.max(0, entryCents - liquidAssetsCents);
  return {
    entryCents,
    liquidAssetsCents,
    affordable: liquidAssetsCents >= entryCents,
    shortfallCents,
  };
}

export interface ILVariantProjection {
  readonly scenarioId: string;
  readonly label: string;
  readonly buyInEntryCents: number;
  readonly allInMonthlyCents: number;
  readonly isAffordable: boolean;
  /**
   * Hypothetical: the refund the family *would receive* at exit at the end
   * of each projection year. Row `i` corresponds to year `i+1` of the
   * projection (1-indexed). Computed against the contract's schedule at
   * `tenureMonths = (i + 1) * 12`. Refunds are not folded into the runway —
   * this is a what-if row the chart and derivation panel read together.
   */
  readonly refundAtExitByYearCents: readonly number[];
  /**
   * Pass-through of the existing runway's per-year assets-end cents, one
   * row per projection year. Used as the per-option line in the overlay
   * chart; the IL comparison panel reads these verbatim — no recomputation.
   */
  readonly assetsEndByYearCents: readonly number[];
}

/**
 * Project the overlay chart's per-option row for each `independent_living`
 * scenario in `scenarios`. Income, assets and assumptions are intentionally
 * shared across all options so the comparison is genuine (varying only the
 * community contract). The function does NOT mutate `plan` or `scenarios`.
 *
 * The chart's invariants (spec §6.5b + §6 lesson "Format a Total and Its
 * Parts at the Same Precision"): for each m ∈ [0..projectionYears × 12] and
 * each option i, the per-line assets-end value equals the runway engine's
 * `Σ pot.balanceCents` at month m. Refund values are read alongside the
 * runway but never folded into the running balance.
 *
 * Scenarios that are not `independent_living` are skipped rather than
 * projected. A non-IL scenario has no contract to compare, so a row for it
 * would report `isAffordable: true` and an all-zero refund schedule — a
 * confident-looking answer to a question the option cannot be asked. Rows
 * carry `scenarioId`, so callers must align on that rather than on index.
 */
export function projectILVariants(
  plan: Plan,
  scenarios: readonly CareScenario[],
): ILVariantProjection[] {
  const liquidAssets = plan.assets
    .filter((a) => a.liquid)
    .reduce((sum, a) => sum + a.balanceCents, 0);

  return scenarios.flatMap((scenario) => {
    const contract = buyInContractFor(scenario);
    if (!contract) return [];

    const cost = computeCost(scenario);
    const buyInEntryCents = cost.buyInEntryCents;
    const isAffordable = buyInAffordability(liquidAssets, contract).affordable;

    // Reuse the existing runway simulation, untouched. The buy-in is folded
    // into `oneTimeCents` already (see cost.ts) and the runway draws month 1's
    // one-times from the pots automatically — no double counting here.
    const input = buildRunwayInput(plan, scenario);
    const runway = computeRunway(input);

    const refundAtExitByYearCents: number[] = runway.yearlyBreakdown.map((yr) =>
      resolveRefundAtTenure(contract, yr.year * 12),
    );

    const assetsEndByYearCents: number[] = runway.yearlyBreakdown.map(
      (yr) => yr.assetsEndCents,
    );

    return [{
      scenarioId: scenario.id,
      label: scenario.label,
      buyInEntryCents,
      allInMonthlyCents: cost.allInMonthlyCents,
      isAffordable,
      refundAtExitByYearCents,
      assetsEndByYearCents,
    }];
  });
}
