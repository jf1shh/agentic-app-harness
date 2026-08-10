import { describe, it, expect } from 'vitest';
import { effectiveDurationForPacking, LAUNDRY_CYCLE_DAYS } from '../src/utils/laundryCycle';

describe('effectiveDurationForPacking', () => {
  it('Given no laundry access, When the packing duration is computed, Then the full trip length is used regardless of how long the trip runs', () => {
    expect(effectiveDurationForPacking(30, false)).toBe(30);
    expect(effectiveDurationForPacking(3, false)).toBe(3);
  });

  it('Given laundry access and a trip no longer than one laundry cycle, When the packing duration is computed, Then it equals the trip length unchanged', () => {
    expect(effectiveDurationForPacking(5, true)).toBe(5);
    expect(effectiveDurationForPacking(LAUNDRY_CYCLE_DAYS, true)).toBe(LAUNDRY_CYCLE_DAYS);
  });

  it('Given laundry access and a trip longer than one laundry cycle, When the packing duration is computed, Then it plateaus at the laundry-cycle length rather than climbing with the trip', () => {
    expect(effectiveDurationForPacking(30, true)).toBe(LAUNDRY_CYCLE_DAYS);
    expect(effectiveDurationForPacking(LAUNDRY_CYCLE_DAYS + 1, true)).toBe(LAUNDRY_CYCLE_DAYS);
  });
});
