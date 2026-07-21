import { describe, it, expect } from 'vitest';
import { calculateKnapsackPhysics } from '../src/utils/knapsackEngine';
import { Garment, WearabilityReport } from '../src/types';
import { MODELS } from '../src/utils/suitcaseDatabase';

describe('knapsackEngine', () => {
  const mockGarments: Garment[] = [
    { id: 'top1', name: 'T-Shirt', category: 'shirt', roles: ['top'], colors: [], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 1000 },
    { id: 'bottom1', name: 'Jeans', category: 'pants', roles: ['bottom'], colors: [], warmth: 5, exclusionTags: [], weightGrams: 800, volumeCm3: 4000 },
    { id: 'top2', name: 'Jacket', category: 'layer', roles: ['topper'], colors: [], warmth: 8, exclusionTags: [], weightGrams: 1000, volumeCm3: 8000 }
  ];

  const mockReport: WearabilityReport = {
    flexibilityScore: 1,
    mvpItemId: 'bottom1',
    deadWeightIds: [],
    scheduledOutfits: [
      { day: 1, outfit: { id: 'outfit1', top: mockGarments[0], bottom: mockGarments[1], totalWarmth: 7 } },
      // Jacket used on day 2
      { day: 2, outfit: { id: 'outfit2', top: mockGarments[0], bottom: mockGarments[1], topper: mockGarments[2], totalWarmth: 15 } }
    ]
  };

  it('should correctly calculate total weight and volume of packed items', () => {
    const suitcase = MODELS[0]; // Away Carry-On (55 x 34.8 x 22.8) -> ~43 Liters
    const result = calculateKnapsackPhysics(mockReport, mockGarments, suitcase, 'DL'); // Delta (no weight limit, 56x35x23)
    
    // Total packed: T-Shirt (200g) + Jeans (800g) + Jacket (1000g) = 2000g = 2kg
    expect(result.totalWeightKg).toBe(2.0);
    
    // Volume: 1000 + 4000 + 8000 = 13000 cm3 = 13 Liters
    expect(result.totalVolumeLiters).toBe(13.0);
    
    // Suitcase Capacity: (55 * 34.8 * 22.8) / 1000 = 43.6392 Liters
    expect(result.suitcaseCapacityLiters).toBeCloseTo(43.6392);
    
    // Should fit and be compliant with 7kg limit
    expect(result.fitsInSuitcase).toBe(true);
    expect(result.airlineCompliant).toBe(true);
  });
});
