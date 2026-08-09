import { describe, it, expect } from 'vitest';
import { buildManualGarment } from '../src/utils/wardrobeBuilder';
import { GarmentSchema } from '../src/schemas';
import { getThermalValue } from '../src/utils/generator';

describe('buildManualGarment', () => {
  it('Given a manually entered top, When a garment is built, Then its warmth is derived from its own name rather than a constant', () => {
    const garment = buildManualGarment(
      { name: 'Wool Sweater', role: 'top', color: 'grey', isEvening: false },
      'w-1'
    );
    expect(garment.warmth).toBe(getThermalValue('Wool Sweater'));
  });

  it('Given a manually entered top or layer, When a garment is built, Then it gets the lighter weight/volume defaults', () => {
    const top = buildManualGarment({ name: 'Cotton Tee', role: 'top', color: 'white', isEvening: false }, 'w-1');
    const layer = buildManualGarment({ name: 'Silk Camisole', role: 'layer', color: 'navy', isEvening: false }, 'w-2');
    expect(top.weightGrams).toBe(200);
    expect(top.volumeCm3).toBe(600);
    expect(layer.weightGrams).toBe(200);
    expect(layer.volumeCm3).toBe(600);
  });

  it('Given a manually entered bottom or topper, When a garment is built, Then it gets the bulkier weight/volume defaults', () => {
    const bottom = buildManualGarment({ name: 'Denim Jeans', role: 'bottom', color: 'blue', isEvening: false }, 'w-1');
    const topper = buildManualGarment({ name: 'Wool Coat', role: 'topper', color: 'black', isEvening: false }, 'w-2');
    expect(bottom.weightGrams).toBe(500);
    expect(bottom.volumeCm3).toBe(1500);
    expect(topper.weightGrams).toBe(500);
    expect(topper.volumeCm3).toBe(1500);
  });

  it('Given the evening flag, When a garment is built, Then its time reflects the flag rather than always defaulting to day', () => {
    const evening = buildManualGarment({ name: 'Black Dress Shirt', role: 'top', color: 'black', isEvening: true }, 'w-1');
    const day = buildManualGarment({ name: 'Black Dress Shirt', role: 'top', color: 'black', isEvening: false }, 'w-2');
    expect(evening.time).toBe('evening');
    expect(day.time).toBe('day');
  });

  it('Given a name with surrounding whitespace, When a garment is built, Then the stored name is trimmed', () => {
    const garment = buildManualGarment({ name: '  Navy Blazer  ', role: 'topper', color: 'navy', isEvening: false }, 'w-1');
    expect(garment.name).toBe('Navy Blazer');
  });

  it('Given the caller-supplied id, When a garment is built, Then it is used as-is so it can be correlated with a saved photo', () => {
    const garment = buildManualGarment({ name: 'Khaki Chinos', role: 'bottom', color: 'khaki', isEvening: false }, 'w-custom-id');
    expect(garment.id).toBe('w-custom-id');
  });

  it('Given any manually entered garment, When it is built, Then it satisfies the runtime Garment contract', () => {
    // Contract-first: a hand-assembled object that skipped GarmentSchema could
    // reach the wardrobe/knapsack engines with a shape they don't expect.
    const garment = buildManualGarment({ name: 'Beige Trench Coat', role: 'topper', color: 'beige', isEvening: false }, 'w-1');
    expect(GarmentSchema.safeParse(garment).success).toBe(true);
  });
});
