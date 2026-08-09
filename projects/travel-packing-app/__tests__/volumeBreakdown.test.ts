import { describe, it, expect } from 'vitest';
import { computeVolumeBreakdown } from '../src/utils/volumeBreakdown';
import { Garment } from '../src/types';

describe('computeVolumeBreakdown', () => {
  const mockGarments: Garment[] = [
    { id: 'top1', name: 'T-Shirt', category: 'shirt', roles: ['top'], colors: [], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 1000 },
    { id: 'top2', name: 'Blouse', category: 'shirt', roles: ['top'], colors: [], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 1000 },
    { id: 'bottom1', name: 'Jeans', category: 'pants', roles: ['bottom'], colors: [], warmth: 5, exclusionTags: [], weightGrams: 800, volumeCm3: 4000 },
    { id: 'layer1', name: 'Jacket', category: 'layer', roles: ['topper'], colors: [], warmth: 8, exclusionTags: [], weightGrams: 1000, volumeCm3: 4000 },
  ];

  it('Given packed garments across three categories, When the volume breakdown is computed, Then each category sums its garments\' volume, counts its items, and reports its percent share sorted largest first', () => {
    const slices = computeVolumeBreakdown(mockGarments);

    // shirt: 1000 + 1000 = 2000cm3, pants: 4000cm3, layer: 4000cm3 -> total 10000cm3
    expect(slices).toEqual([
      { category: 'pants', volumeCm3: 4000, itemCount: 1, percent: 40 },
      { category: 'layer', volumeCm3: 4000, itemCount: 1, percent: 40 },
      { category: 'shirt', volumeCm3: 2000, itemCount: 2, percent: 20 },
    ]);
  });

  it('Given no packed garments, When the volume breakdown is computed, Then an empty array is returned rather than dividing by zero', () => {
    expect(computeVolumeBreakdown([])).toEqual([]);
  });

  it('Given garments that all carry zero volume, When the volume breakdown is computed, Then an empty array is returned rather than NaN percentages', () => {
    const zeroVolumeGarments: Garment[] = [
      { id: 'g1', name: 'Mystery Item', category: 'misc', roles: ['top'], colors: [], warmth: 1, exclusionTags: [], weightGrams: 100, volumeCm3: 0 },
    ];
    expect(computeVolumeBreakdown(zeroVolumeGarments)).toEqual([]);
  });
});
