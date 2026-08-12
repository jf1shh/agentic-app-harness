import { describe, it, expect } from 'vitest';
import { analyzeWardrobe, generateAllValidOutfits, deriveUsageStats } from '../src/utils/wardrobeEngine';
import { Garment, DayItinerary } from '../src/types';

describe('wardrobeEngine', () => {
  const basicGarments: Garment[] = [
    { id: 'top1', name: 'White Linen Shirt', category: 'shirt', roles: ['top', 'topper'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
    { id: 'top2', name: 'Navy T-Shirt', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 3, exclusionTags: [], weightGrams: 150, volumeCm3: 600 },
    { id: 'bottom1', name: 'Navy Chinos', category: 'pants', roles: ['bottom'], colors: ['navy'], warmth: 4, exclusionTags: ['clash_navy'], weightGrams: 500, volumeCm3: 2000 },
    { id: 'bottom2', name: 'Khaki Shorts', category: 'shorts', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
  ];

  it('Given garments carrying conflicting exclusion tags, When outfits are generated, Then the clashing combinations are excluded', () => {
    const outfits = generateAllValidOutfits(basicGarments);
    
    // Navy Chinos (bottom1) has 'clash_navy'. 
    // Navy T-Shirt (top2) is 'navy'. 
    // So top2 + bottom1 should NOT exist.
    const clashOutfit = outfits.find(o => o.top.id === 'top2' && o.bottom.id === 'bottom1');
    expect(clashOutfit).toBeUndefined();

    // White shirt + Navy chinos should exist
    const validOutfit = outfits.find(o => o.top.id === 'top1' && o.bottom.id === 'bottom1');
    expect(validOutfit).toBeDefined();
  });

  it('Given a garment that can fill more than one role, When outfits are generated, Then it is used in each role it supports', () => {
    const outfits = generateAllValidOutfits(basicGarments);
    
    // top1 (White Linen Shirt) is both top and topper.
    // It should form an outfit as a top
    const asTop = outfits.find(o => o.top.id === 'top1' && !o.topper);
    expect(asTop).toBeDefined();

    // It should form an outfit as a topper over top2
    const asTopper = outfits.find(o => o.top.id === 'top2' && o.topper?.id === 'top1');
    expect(asTopper).toBeDefined();
  });

  it('Given a multi-day itinerary, When the wardrobe is analysed, Then no base outfit repeats on consecutive days and unworn garments are reported as dead weight', () => {
    const itinerary: DayItinerary[] = [
      { dayNumber: 1, weatherWarmthTarget: 5, activity: 'sightseeing' },
      { dayNumber: 2, weatherWarmthTarget: 5, activity: 'sightseeing' },
      { dayNumber: 3, weatherWarmthTarget: 5, activity: 'sightseeing' },
    ];

    // Add a dead weight item (heavy wool sweater)
    const g: Garment[] = [...basicGarments, { id: 'dead1', name: 'Heavy Wool', category: 'sweater', roles: ['topper'] as ('top' | 'bottom' | 'topper' | 'layer')[], colors: ['black'], warmth: 10, exclusionTags: [], weightGrams: 1000, volumeCm3: 5000 }];

    const report = analyzeWardrobe(g, itinerary);

    // Check consecutive repeats
    expect(report.scheduledOutfits.length).toBe(3);
    const day1Base = `${report.scheduledOutfits[0].outfit.top.id}-${report.scheduledOutfits[0].outfit.bottom.id}`;
    const day2Base = `${report.scheduledOutfits[1].outfit.top.id}-${report.scheduledOutfits[1].outfit.bottom.id}`;
    expect(day1Base).not.toEqual(day2Base);

    // Heavy wool sweater shouldn't be picked because target is 5 (hot day)
    expect(report.deadWeightIds).toContain('dead1');
  });

  // Mutation testing (node scripts/run-mutation.mjs travel-packing-app
  // --mutate "src/utils/wardrobeEngine.ts") found most of this file at
  // NoCoverage: only ONE direction of the exclusion-tag clash was ever
  // exercised (bottom's tag vs top's color), and the topper conflict checks,
  // the empty-colors "match anyway" fallbacks, and the entire evening/hot-day/
  // fallback-cascade logic in analyzeWardrobe had never run under any test.

  it('Given a top carrying an exclusion tag that clashes with the bottom\'s color, When outfits are generated, Then that combination is excluded (the other direction from the existing clash test)', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Clashing Top', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, exclusionTags: ['clash_khaki'], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Khaki Shorts', category: 'shorts', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    const outfits = generateAllValidOutfits(garments);
    expect(outfits.find((o) => o.top.id === 't1' && o.bottom.id === 'b1')).toBeUndefined();
  });

  it('Given a top with no colors at all, When paired with any bottom, Then the color check matches rather than blocking the outfit', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Colorless Top', category: 'shirt', roles: ['top'], colors: [], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Any Bottom', category: 'shorts', roles: ['bottom'], colors: ['red'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    const outfits = generateAllValidOutfits(garments);
    expect(outfits.find((o) => o.top.id === 't1' && o.bottom.id === 'b1')).toBeDefined();
  });

  it('Given a topper carrying an exclusion tag that clashes with the top or bottom color, When outfits with that topper are generated, Then it is excluded', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Navy Top', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Khaki Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
      { id: 'top1', name: 'Clashing Topper', category: 'jacket', roles: ['topper'], colors: ['grey'], warmth: 3, exclusionTags: ['clash_navy'], weightGrams: 400, volumeCm3: 1200 },
    ];
    const outfits = generateAllValidOutfits(garments);
    expect(outfits.some((o) => o.topper?.id === 'top1')).toBe(false);
  });

  it('Given a topper with no colors at all, When paired with a top and bottom, Then it is treated as matching rather than blocking the outfit', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Top', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
      { id: 'top1', name: 'Colorless Topper', category: 'jacket', roles: ['topper'], colors: [], warmth: 3, exclusionTags: [], weightGrams: 400, volumeCm3: 1200 },
    ];
    const outfits = generateAllValidOutfits(garments);
    expect(outfits.some((o) => o.topper?.id === 'top1')).toBe(true);
  });

  it('Given an evening-only itinerary day, When the wardrobe is analysed, Then the selected outfit carries an evening-tagged top or bottom rather than an all-day one', () => {
    // Any outfit where EITHER piece is evening-tagged counts as an evening
    // outfit (the `||` in isEveningOutfit), so with a day top/bottom and an
    // evening top/bottom in the pool, the day-only combination is the one
    // that must be excluded -- assert the real invariant the filter enforces,
    // not a specific combination the iteration order happens to prefer.
    const garments: Garment[] = [
      { id: 'dt', name: 'Day Top', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 5, time: 'day', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'db', name: 'Day Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 3, time: 'day', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
      { id: 'et', name: 'Evening Top', category: 'shirt', roles: ['top'], colors: ['black'], warmth: 5, time: 'evening', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'eb', name: 'Evening Bottom', category: 'pants', roles: ['bottom'], colors: ['black'], warmth: 3, time: 'evening', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    const itinerary: DayItinerary[] = [{ dayNumber: 1, weatherWarmthTarget: 8, activity: 'formal' }];
    const report = analyzeWardrobe(garments, itinerary);
    const selected = report.scheduledOutfits[0]!.outfit;
    expect(selected.top.time === 'evening' || selected.bottom.time === 'evening').toBe(true);
    expect(selected.top.id === 'dt' && selected.bottom.id === 'db').toBe(false);
  });

  it('Given an ordinary (non-evening) itinerary day, When the wardrobe is analysed, Then an evening-only outfit is not selected', () => {
    const garments: Garment[] = [
      { id: 'et', name: 'Evening Top', category: 'shirt', roles: ['top'], colors: ['black'], warmth: 5, time: 'evening', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'eb', name: 'Evening Bottom', category: 'pants', roles: ['bottom'], colors: ['black'], warmth: 3, time: 'evening', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
      { id: 'dt', name: 'Day Top', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 5, time: 'day', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'db', name: 'Day Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 3, time: 'day', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    const itinerary: DayItinerary[] = [{ dayNumber: 1, weatherWarmthTarget: 8, activity: 'sightseeing' }];
    const report = analyzeWardrobe(garments, itinerary);
    expect(report.scheduledOutfits[0]?.outfit.top.id).toBe('dt');
  });

  it('Given a hot day (above 25C) and only all-dark outfits available, When the wardrobe is analysed, Then the hot-weather fallback still schedules something rather than leaving the day empty', () => {
    // Both outfits are all-dark, so the strict hot-day filter excludes both --
    // this is exactly the "cascading fallback" .agents/AGENTS.md §6 requires:
    // itinerary days must never receive an empty schedule just because the
    // hot-weather color rule was overly restrictive.
    // Same color on both pieces so the color-match check trivially passes
    // (black clashes with navy in COLOR_MATCHES, which would otherwise mean
    // no outfit is ever generated at all and the test would prove nothing
    // about the hot-day fallback specifically).
    const garments: Garment[] = [
      { id: 't1', name: 'Black Top', category: 'shirt', roles: ['top'], colors: ['black'], warmth: 5, time: 'day', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Black Bottom', category: 'pants', roles: ['bottom'], colors: ['black'], warmth: 3, time: 'day', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    const itinerary: DayItinerary[] = [
      { dayNumber: 1, weatherWarmthTarget: 8, activity: 'sightseeing', maxTempC: 30 },
    ];
    const report = analyzeWardrobe(garments, itinerary);
    expect(report.scheduledOutfits).toHaveLength(1);
  });

  it('Given a warmth target nothing matches within +/-3 but something matches within +/-5, When the wardrobe is analysed, Then the widened fallback picks it rather than skipping the day', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Top', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, time: 'day', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 2, time: 'day', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    // Outfit totalWarmth is 4; a target of 8 is 4 away (outside +/-3, inside +/-5).
    const itinerary: DayItinerary[] = [{ dayNumber: 1, weatherWarmthTarget: 8, activity: 'sightseeing' }];
    const report = analyzeWardrobe(garments, itinerary);
    expect(report.scheduledOutfits).toHaveLength(1);
    expect(report.scheduledOutfits[0]?.outfit.top.id).toBe('t1');
  });

  it('Given a warmth target nothing matches even within +/-5, When the wardrobe is analysed, Then the full fallback to every outfit still schedules the day', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Top', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 1, time: 'day', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 1, time: 'day', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    // Outfit totalWarmth is 2; a target of 20 is 18 away -- outside both bands.
    const itinerary: DayItinerary[] = [{ dayNumber: 1, weatherWarmthTarget: 20, activity: 'sightseeing' }];
    const report = analyzeWardrobe(garments, itinerary);
    expect(report.scheduledOutfits).toHaveLength(1);
  });

  it('Given a wardrobe and its generated outfits, When analysed, Then the flexibility score is exactly outfits-per-garment', () => {
    const garments: Garment[] = [
      { id: 't1', name: 'Top', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, time: 'day', exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
      { id: 'b1', name: 'Bottom', category: 'pants', roles: ['bottom'], colors: ['khaki'], warmth: 2, time: 'day', exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    ];
    const itinerary: DayItinerary[] = [{ dayNumber: 1, weatherWarmthTarget: 4, activity: 'sightseeing' }];
    const report = analyzeWardrobe(garments, itinerary);
    const allOutfits = generateAllValidOutfits(garments);
    expect(report.flexibilityScore).toBe(allOutfits.length / garments.length);
  });

  it('Given no garments at all, When analysed, Then the flexibility score is zero rather than dividing by zero', () => {
    const report = analyzeWardrobe([], []);
    expect(report.flexibilityScore).toBe(0);
    expect(Number.isFinite(report.flexibilityScore)).toBe(true);
  });
});

describe('deriveUsageStats', () => {
  const g: Garment[] = [
    { id: 'top1', name: 'White Linen Shirt', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
    { id: 'top2', name: 'Navy T-Shirt', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 3, exclusionTags: [], weightGrams: 150, volumeCm3: 600 },
    { id: 'bottom1', name: 'Khaki Shorts', category: 'shorts', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
    { id: 'bottom2', name: 'Navy Chinos', category: 'pants', roles: ['bottom'], colors: ['navy'], warmth: 4, exclusionTags: [], weightGrams: 500, volumeCm3: 2000 },
    { id: 'unused', name: 'Spare Cardigan', category: 'sweater', roles: ['topper'], colors: ['grey'], warmth: 6, exclusionTags: [], weightGrams: 400, volumeCm3: 1200 },
  ];

  it('Given a schedule that wears top1 on two of three days, When usage stats are derived, Then top1 is the MVP and the never-scheduled garment is dead weight', () => {
    const outfit1 = { id: 'o1', top: g[0], bottom: g[2], totalWarmth: 4 };
    const outfit2 = { id: 'o2', top: g[1], bottom: g[3], totalWarmth: 7 };
    const scheduledOutfits = [
      { day: 1, outfit: outfit1 },
      { day: 2, outfit: outfit2 },
      { day: 3, outfit: outfit1 },
    ];

    const stats = deriveUsageStats(scheduledOutfits, g);

    expect(stats.mvpItemId).toBe('top1');
    expect(stats.deadWeightIds).toEqual(['unused']);
    expect(stats.swapSuggestion?.removeId).toBe('unused');
  });

  it('Given an empty schedule, When usage stats are derived, Then every garment is reported as dead weight and there is no MVP', () => {
    const stats = deriveUsageStats([], g);
    expect(stats.mvpItemId).toBeNull();
    expect(stats.deadWeightIds).toEqual(g.map((item) => item.id));
  });

  // Mutation testing found the "top" and "bottom" branches of the swap
  // suggestion's if/else-if/else chain entirely NoCoverage -- the existing
  // fixtures' unused item was always a topper (line 69 above), so only that
  // first branch had ever run.
  it('Given the never-worn item is a top, When usage stats are derived, Then the suggestion is worded for a top', () => {
    const outfit = { id: 'o1', top: g[1], bottom: g[2], totalWarmth: 5 }; // top2 + bottom1; top1 unused
    const stats = deriveUsageStats([{ day: 1, outfit }], [g[0], g[1], g[2]]);
    expect(stats.deadWeightIds).toEqual(['top1']);
    expect(stats.swapSuggestion?.suggestion).toContain('Top');
  });

  it('Given the never-worn item is a bottom, When usage stats are derived, Then the suggestion is worded for a bottom', () => {
    const outfit = { id: 'o1', top: g[0], bottom: g[3], totalWarmth: 6 }; // top1 + bottom2; bottom1 unused
    const stats = deriveUsageStats([{ day: 1, outfit }], [g[0], g[2], g[3]]);
    expect(stats.deadWeightIds).toEqual(['bottom1']);
    expect(stats.swapSuggestion?.suggestion).toContain('Shorts');
  });
});
