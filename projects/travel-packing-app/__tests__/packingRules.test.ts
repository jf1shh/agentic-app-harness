import { describe, it, expect } from 'vitest';
import { generatePackingList } from '../src/utils/packingRules';

describe('generatePackingList', () => {
  it('should generate basic items for a trip based on duration', () => {
    const list = generatePackingList('Hawaii', 4, []);
    
    expect(list.some(i => i.name === 'Underwear' && i.quantity === 4)).toBe(true);
    expect(list.some(i => i.name === 'Socks' && i.quantity === 4)).toBe(true);
    expect(list.some(i => i.name === 'Toothbrush')).toBe(true);
  });

  it('should include swimwear if swimming activity is selected', () => {
    const list = generatePackingList('Hawaii', 4, ['swimming']);
    
    expect(list.some(i => i.name === 'Swimsuit')).toBe(true);
    expect(list.some(i => i.name === 'Sunscreen')).toBe(true);
  });

  it('should include hiking gear if hiking activity is selected', () => {
    const list = generatePackingList('Mountains', 4, ['hiking']);
    
    expect(list.some(i => i.name === 'Hiking Boots')).toBe(true);
  });

  it('should generate items properly for a 1-day trip', () => {
    const list = generatePackingList('City', 1, []);
    
    expect(list.some(i => i.name === 'Pants / Shorts' && i.quantity === 1)).toBe(true);
  });
});
