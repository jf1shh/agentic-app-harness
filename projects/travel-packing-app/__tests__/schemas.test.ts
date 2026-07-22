import { describe, it, expect } from 'vitest';
import { GarmentSchema } from '../src/schemas';

describe('contract-first GarmentSchema', () => {
  const validGarment = {
    id: 'g-1',
    name: 'White Linen Buttondown',
    category: 'top',
    roles: ['top', 'topper'],
    colors: ['white'],
    warmth: 2,
    exclusionTags: [],
    weightGrams: 200,
    volumeCm3: 600,
    time: 'day',
  };

  it('accepts a well-formed garment', () => {
    // Given a valid garment, When validated, Then it passes
    expect(GarmentSchema.safeParse(validGarment).success).toBe(true);
  });

  it('treats time as optional', () => {
    const { time, ...noTime } = validGarment;
    void time;
    expect(GarmentSchema.safeParse(noTime).success).toBe(true);
  });

  it('rejects an unknown role', () => {
    // Given a garment with a role outside the enum
    const bad = { ...validGarment, roles: ['sleeve'] };
    // Then validation fails
    expect(GarmentSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a non-numeric warmth', () => {
    const bad = { ...validGarment, warmth: 'warm' };
    expect(GarmentSchema.safeParse(bad).success).toBe(false);
  });
});
