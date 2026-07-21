import { describe, it, expect } from 'vitest';
import { analyzeWardrobe, generateAllValidOutfits } from '../src/utils/wardrobeEngine';
import { Garment, DayItinerary } from '../src/types';

describe('wardrobeEngine', () => {
  const basicGarments: Garment[] = [
    { id: 'top1', name: 'White Linen Shirt', category: 'shirt', roles: ['top', 'topper'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
    { id: 'top2', name: 'Navy T-Shirt', category: 'shirt', roles: ['top'], colors: ['navy'], warmth: 3, exclusionTags: [], weightGrams: 150, volumeCm3: 600 },
    { id: 'bottom1', name: 'Navy Chinos', category: 'pants', roles: ['bottom'], colors: ['navy'], warmth: 4, exclusionTags: ['clash_navy'], weightGrams: 500, volumeCm3: 2000 },
    { id: 'bottom2', name: 'Khaki Shorts', category: 'shorts', roles: ['bottom'], colors: ['khaki'], warmth: 2, exclusionTags: [], weightGrams: 300, volumeCm3: 1000 },
  ];

  it('should filter out outfits based on exclusion tags', () => {
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

  it('should handle multi-role garments correctly', () => {
    const outfits = generateAllValidOutfits(basicGarments);
    
    // top1 (White Linen Shirt) is both top and topper.
    // It should form an outfit as a top
    const asTop = outfits.find(o => o.top.id === 'top1' && !o.topper);
    expect(asTop).toBeDefined();

    // It should form an outfit as a topper over top2
    const asTopper = outfits.find(o => o.top.id === 'top2' && o.topper?.id === 'top1');
    expect(asTopper).toBeDefined();
  });

  it('should prevent consecutive day base outfit repeats and detect dead weight', () => {
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
});
