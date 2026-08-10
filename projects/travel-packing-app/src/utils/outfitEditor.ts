import { Garment, Outfit, WearabilityReport } from '../types';
import { generateAllValidOutfits, deriveUsageStats } from './wardrobeEngine';

export type OutfitRole = 'top' | 'bottom' | 'topper';

/**
 * Finds the outfit that keeps every role of `currentOutfit` except `role`,
 * which becomes `replacement`. Checks membership against
 * generateAllValidOutfits() -- the engine's own source of truth for which
 * pairings are allowed -- so a manual override can never accept a
 * combination (color clash, exclusion tag) the automatic scheduler would
 * itself reject. Returns null when no such valid outfit exists; a
 * `replacement` that doesn't carry the target role at all is naturally
 * excluded the same way, since generateAllValidOutfits() only ever places a
 * garment in a role it declares.
 */
export function findValidSwap(
  currentOutfit: Outfit,
  role: OutfitRole,
  replacement: Garment,
  allGarments: Garment[]
): Outfit | null {
  const desiredTopId = role === 'top' ? replacement.id : currentOutfit.top.id;
  const desiredBottomId = role === 'bottom' ? replacement.id : currentOutfit.bottom.id;
  const desiredTopperId = role === 'topper' ? replacement.id : currentOutfit.topper?.id;

  const candidates = generateAllValidOutfits(allGarments);
  return (
    candidates.find(
      (o) =>
        o.top.id === desiredTopId &&
        o.bottom.id === desiredBottomId &&
        o.topper?.id === desiredTopperId
    ) ?? null
  );
}

/**
 * Applies a manual garment swap to one day of an already-scheduled
 * WearabilityReport. Returns null (leaving the original report untouched)
 * when the target day doesn't exist in the schedule or the swap would
 * produce an invalid outfit. On success, only the target day's outfit
 * changes -- every other day is left exactly as scheduled -- and
 * mvpItemId/deadWeightIds/swapSuggestion are re-derived from the new
 * schedule via deriveUsageStats(), the same function analyzeWardrobe()
 * itself uses, so they never go stale relative to the hand-edited schedule.
 */
export function applyGarmentSwap(
  report: WearabilityReport,
  day: number,
  role: OutfitRole,
  replacement: Garment,
  allGarments: Garment[]
): WearabilityReport | null {
  const entryIndex = report.scheduledOutfits.findIndex((s) => s.day === day);
  if (entryIndex === -1) return null;

  const swapped = findValidSwap(report.scheduledOutfits[entryIndex].outfit, role, replacement, allGarments);
  if (!swapped) return null;

  const scheduledOutfits = report.scheduledOutfits.map((s, i) =>
    i === entryIndex ? { day, outfit: swapped } : s
  );

  return {
    ...report,
    scheduledOutfits,
    ...deriveUsageStats(scheduledOutfits, allGarments),
  };
}
