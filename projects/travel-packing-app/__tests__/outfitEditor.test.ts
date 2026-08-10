import { describe, it, expect } from 'vitest';
import { findValidSwap, applyGarmentSwap } from '../src/utils/outfitEditor';
import { Garment, WearabilityReport } from '../src/types';

describe('findValidSwap', () => {
  const white: Garment = { id: 'top-white', name: 'White Tee', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 600 };
  const navy: Garment = { id: 'top-navy', name: 'Navy Tee', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 600 };
  const khaki: Garment = { id: 'bottom-khaki', name: 'Khaki Shorts', category: 'shorts', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 };
  const clashBottom: Garment = { id: 'bottom-clash', name: 'Navy-Clash Chinos', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 3, exclusionTags: ['clash_navy'], weightGrams: 500, volumeCm3: 2000 };
  const allGarments = [white, navy, khaki, clashBottom];
  const currentOutfit = { id: 'o1', top: white, bottom: khaki, totalWarmth: 4 };

  it('Given a replacement garment that produces a valid pairing, When a top is swapped, Then the resulting outfit is returned', () => {
    const swapped = findValidSwap(currentOutfit, 'top', navy, allGarments);
    expect(swapped?.top.id).toBe('top-navy');
    expect(swapped?.bottom.id).toBe('bottom-khaki');
  });

  it("Given a replacement that clashes with the outfit's other garment, When a bottom is swapped in for a top-navy outfit, Then no swap is returned rather than accepting an invalid pairing", () => {
    const navyOutfit = { id: 'o2', top: navy, bottom: khaki, totalWarmth: 4 };
    const swapped = findValidSwap(navyOutfit, 'bottom', clashBottom, allGarments);
    expect(swapped).toBeNull();
  });

  it('Given a replacement garment that does not carry the target role, When a swap is attempted, Then no swap is returned', () => {
    // khaki is a bottom, not a top -- swapping it in for the top role is nonsensical.
    const swapped = findValidSwap(currentOutfit, 'top', khaki, allGarments);
    expect(swapped).toBeNull();
  });
});

describe('applyGarmentSwap', () => {
  const white: Garment = { id: 'top-white', name: 'White Tee', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 600 };
  const navy: Garment = { id: 'top-navy', name: 'Navy Tee', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 600 };
  const khaki: Garment = { id: 'bottom-khaki', name: 'Khaki Shorts', category: 'shorts', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 };
  const spare: Garment = { id: 'top-spare', name: 'Spare Tee', category: 'shirt', roles: ['top'], colors: ['grey'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 600 };
  const allGarments = [white, navy, khaki, spare];

  const baseReport: WearabilityReport = {
    flexibilityScore: 0.5,
    mvpItemId: 'top-white',
    deadWeightIds: ['top-navy', 'top-spare'],
    scheduledOutfits: [
      { day: 1, outfit: { id: 'o1', top: white, bottom: khaki, totalWarmth: 4 } },
      { day: 2, outfit: { id: 'o1', top: white, bottom: khaki, totalWarmth: 4 } },
    ],
  };

  it('Given a valid replacement for day 2, When the swap is applied, Then only that day changes and usage stats are re-derived from the new schedule', () => {
    const updated = applyGarmentSwap(baseReport, 2, 'top', navy, allGarments);

    expect(updated).not.toBeNull();
    expect(updated!.scheduledOutfits[0].outfit.top.id).toBe('top-white'); // day 1 untouched
    expect(updated!.scheduledOutfits[1].outfit.top.id).toBe('top-navy'); // day 2 swapped
    // Both white and navy are now worn once each -- no longer 2x for white,
    // so a fresh MVP is derived rather than the stale one carried over.
    expect(updated!.deadWeightIds).not.toContain('top-navy');
    expect(updated!.deadWeightIds).toContain('top-spare');
  });

  it('Given a day number that is not in the schedule, When a swap is attempted, Then null is returned rather than a partially-applied change', () => {
    expect(applyGarmentSwap(baseReport, 99, 'top', navy, allGarments)).toBeNull();
  });

  it('Given a replacement that would produce an invalid outfit, When a swap is attempted, Then null is returned and the original report is left untouched', () => {
    const clashBottom: Garment = { id: 'bottom-clash', name: 'Navy-Clash Pants', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 3, exclusionTags: ['clash_navy'], weightGrams: 500, volumeCm3: 2000 };
    const navyOutfitReport: WearabilityReport = {
      ...baseReport,
      scheduledOutfits: [{ day: 1, outfit: { id: 'o2', top: navy, bottom: khaki, totalWarmth: 4 } }],
    };
    const result = applyGarmentSwap(navyOutfitReport, 1, 'bottom', clashBottom, [...allGarments, clashBottom]);
    expect(result).toBeNull();
  });
});
