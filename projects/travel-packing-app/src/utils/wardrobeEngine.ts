import { Garment, Outfit, DayItinerary, WearabilityReport } from '../types';
import { doColorsMatch } from './generator';

export function generateAllValidOutfits(garments: Garment[]): Outfit[] {
  const tops = garments.filter(g => g.roles.includes('top'));
  const bottoms = garments.filter(g => g.roles.includes('bottom'));
  const toppers = garments.filter(g => g.roles.includes('topper'));

  const validOutfits: Outfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      // 1. Basic pairing rule check using exclusion tags
      // E.g., if bottom has "clash_navy" and top has color "navy"
      const bottomConflicts = bottom.exclusionTags.some(tag => 
        tag.startsWith('clash_') && top.colors.includes(tag.replace('clash_', ''))
      );
      const topConflicts = top.exclusionTags.some(tag => 
        tag.startsWith('clash_') && bottom.colors.includes(tag.replace('clash_', ''))
      );

      if (bottomConflicts || topConflicts) continue;

      // 2. Color Match check
      let colorsMatch = false;
      if (top.colors.length > 0 && bottom.colors.length > 0) {
        colorsMatch = top.colors.some(tc => bottom.colors.some(bc => doColorsMatch(tc, bc)));
      } else {
        colorsMatch = true;
      }
      
      if (!colorsMatch) continue;

      const baseWarmth = top.warmth + bottom.warmth;
      const outfitIdBase = `${top.id}-${bottom.id}`;

      // Outfit without topper
      validOutfits.push({
        id: outfitIdBase,
        top,
        bottom,
        totalWarmth: baseWarmth
      });

      // Outfit with topper
      for (const topper of toppers) {
        // A garment cannot be both the top and the topper in the same outfit
        if (topper.id === top.id || topper.id === bottom.id) continue;

        const topperConflictsTop = topper.exclusionTags.some(tag => 
          tag.startsWith('clash_') && top.colors.includes(tag.replace('clash_', ''))
        );
        const topperConflictsBottom = topper.exclusionTags.some(tag => 
          tag.startsWith('clash_') && bottom.colors.includes(tag.replace('clash_', ''))
        );

        if (topperConflictsTop || topperConflictsBottom) continue;

        let topperMatchesTop = false;
        let topperMatchesBottom = false;
        if (topper.colors.length > 0) {
           topperMatchesTop = topper.colors.some(tc => top.colors.some(bc => doColorsMatch(tc, bc)));
           topperMatchesBottom = topper.colors.some(tc => bottom.colors.some(bc => doColorsMatch(tc, bc)));
        } else {
           topperMatchesTop = true;
           topperMatchesBottom = true;
        }

        if (!topperMatchesTop || !topperMatchesBottom) continue;

        validOutfits.push({
          id: `${outfitIdBase}-${topper.id}`,
          top,
          bottom,
          topper,
          totalWarmth: baseWarmth + topper.warmth
        });
      }
    }
  }

  return validOutfits;
}

export function analyzeWardrobe(garments: Garment[], itinerary: DayItinerary[]): WearabilityReport {
  const allOutfits = generateAllValidOutfits(garments);
  
  const scheduledOutfits: { day: number; outfit: Outfit }[] = [];
  const usedGarmentIds = new Set<string>();
  const garmentUsageCount: Record<string, number> = {};

  let previousBaseId = '';

  for (const day of itinerary) {
    const isEveningEvent = day.activity === 'formal' || day.activity === 'nightout';

    // Filter outfits based on warmth and time of day
    let suitableOutfits = allOutfits.filter(o => {
      // Warmth filter
      if (Math.abs(o.totalWarmth - day.weatherWarmthTarget) > 3) return false;
      
      // Time filter (strict evening check)
      const isEveningOutfit = o.top.time === 'evening' || o.bottom.time === 'evening';
      if (isEveningEvent && !isEveningOutfit) return false;
      if (!isEveningEvent && isEveningOutfit) return false;

      // Hot Weather Color filter (No all-dark outfits on hot days)
      if (day.maxTempC !== undefined && day.maxTempC > 25) {
        const darkColors = ['black', 'navy', 'brown'];
        const topIsDark = o.top.colors.every(c => darkColors.includes(c));
        const bottomIsDark = o.bottom.colors.every(c => darkColors.includes(c));
        if (topIsDark && bottomIsDark) return false;
      }

      return true;
    });

    if (suitableOutfits.length === 0) {
      // Fallback if strict time or warmth fails
      suitableOutfits = allOutfits.filter(o => 
        Math.abs(o.totalWarmth - day.weatherWarmthTarget) <= 5
      );
      if (suitableOutfits.length === 0) suitableOutfits = allOutfits;
    }

    // Find first outfit that doesn't repeat the base of the previous day
    let selectedOutfit: Outfit | null = null;
    for (const outfit of suitableOutfits) {
      const baseId = `${outfit.top.id}-${outfit.bottom.id}`;
      if (baseId !== previousBaseId) {
        selectedOutfit = outfit;
        previousBaseId = baseId;
        break;
      }
    }

    if (!selectedOutfit && suitableOutfits.length > 0) {
      selectedOutfit = suitableOutfits[0];
      previousBaseId = `${selectedOutfit.top.id}-${selectedOutfit.bottom.id}`;
    }

    if (selectedOutfit) {
      scheduledOutfits.push({ day: day.dayNumber, outfit: selectedOutfit });
      
      const ids = [selectedOutfit.top.id, selectedOutfit.bottom.id];
      if (selectedOutfit.topper) ids.push(selectedOutfit.topper.id);

      ids.forEach(id => {
        usedGarmentIds.add(id);
        garmentUsageCount[id] = (garmentUsageCount[id] || 0) + 1;
      });
    }
  }

  // Calculate MVP
  let mvpItemId: string | null = null;
  let maxUsage = 0;
  for (const [id, count] of Object.entries(garmentUsageCount)) {
    if (count > maxUsage) {
      maxUsage = count;
      mvpItemId = id;
    }
  }

  // Calculate Dead Weight
  const deadWeightIds = garments
    .map(g => g.id)
    .filter(id => !usedGarmentIds.has(id));

  const flexibilityScore = allOutfits.length > 0 ? allOutfits.length / garments.length : 0;

  let swapSuggestion;
  if (deadWeightIds.length > 0) {
    const removeId = deadWeightIds[0];
    const item = garments.find(g => g.id === removeId);
    if (item) {
      if (item.roles.includes('topper')) {
        swapSuggestion = {
          removeId,
          suggestion: 'A versatile mid-layer (like a neutral Cardigan)',
          reason: 'This layer is dead weight. A lighter layer would provide better warmth flexibility.'
        };
      } else if (item.roles.includes('top')) {
        swapSuggestion = {
          removeId,
          suggestion: 'A versatile Light-colored Top',
          reason: 'This top clashed or was too warm. A lighter option would increase your outfit permutations on hot days.'
        };
      } else {
        swapSuggestion = {
          removeId,
          suggestion: 'Neutral Shorts or lightweight pants',
          reason: 'This bottom was never worn. A lighter or neutral-colored option would increase flexibility.'
        };
      }
    }
  }

  return {
    flexibilityScore,
    mvpItemId,
    deadWeightIds,
    scheduledOutfits,
    swapSuggestion
  };
}
