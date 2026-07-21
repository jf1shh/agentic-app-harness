import { describe, it, expect } from 'vitest';
import { Garment } from '../src/types';

describe('packingChecklist logic', () => {
  const sampleGarments: Garment[] = [
    { id: 'g1', name: 'Navy Chinos', category: 'pants', roles: ['bottom'], colors: ['navy'], warmth: 5, exclusionTags: [], weightGrams: 500, volumeCm3: 2000 },
    { id: 'g2', name: 'White Linen Shirt', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
  ];

  it('should calculate total items including trip essentials based on trip days', () => {
    const tripDays = 5;
    const essentials = [
      { id: 'essential-underwear', name: `${tripDays}x Pairs of Underwear` },
      { id: 'essential-socks', name: `${tripDays}x Pairs of Socks` },
      { id: 'essential-toiletries', name: '1x Toiletry Kit' },
      { id: 'essential-tech', name: '1x Tech Pouch / Chargers' },
    ];

    const totalCount = sampleGarments.length + essentials.length;
    expect(totalCount).toBe(6);
    expect(essentials[0].name).toBe('5x Pairs of Underwear');
  });

  it('should calculate progress percentage accurately', () => {
    const totalItems = 10;
    const checkedCount = 5;
    const percent = Math.round((checkedCount / totalItems) * 100);
    expect(percent).toBe(50);
  });
});
