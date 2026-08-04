import { describe, it, expect } from 'vitest';
import { computeCountUpValue } from './countUp';

describe('computeCountUpValue', () => {
  it('Given zero elapsed time, When the value is computed, Then it starts at zero', () => {
    expect(computeCountUpValue(200, 0, 1000)).toBe(0);
  });

  it('Given elapsed time equal to the full duration, When the value is computed, Then it reaches the target exactly', () => {
    expect(computeCountUpValue(200, 1000, 1000)).toBe(200);
  });

  it('Given elapsed time past the duration, When the value is computed, Then it is clamped to the target rather than overshooting', () => {
    expect(computeCountUpValue(200, 5000, 1000)).toBe(200);
  });

  it('Given elapsed time at the halfway point, When the value is computed, Then it is half the target', () => {
    expect(computeCountUpValue(200, 500, 1000)).toBe(100);
  });

  it('Given a negative elapsed time (clock skew), When the value is computed, Then it is clamped to zero rather than going negative', () => {
    expect(computeCountUpValue(200, -50, 1000)).toBe(0);
  });

  it('Given a duration of zero or less, When the value is computed, Then it jumps straight to the target', () => {
    expect(computeCountUpValue(200, 0, 0)).toBe(200);
    expect(computeCountUpValue(200, 0, -10)).toBe(200);
  });

  it('Given a target of zero, When the value is computed at any elapsed time, Then it stays zero', () => {
    expect(computeCountUpValue(0, 500, 1000)).toBe(0);
  });
});
