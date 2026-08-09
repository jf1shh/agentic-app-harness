import { describe, it, expect } from 'vitest';
import { getAdapterPlugType } from '../src/utils/plugs';

describe('getAdapterPlugType', () => {
  it('Given a destination country with one known plug type, When resolved, Then that plug type is returned', () => {
    expect(getAdapterPlugType('DE')).toBe('C/F');
    expect(getAdapterPlugType('GB')).toBe('G');
    expect(getAdapterPlugType('US')).toBe('A/B');
  });

  it('Given a lowercase country code, When resolved, Then the lookup is case-insensitive', () => {
    expect(getAdapterPlugType('de')).toBe('C/F');
  });

  it('Given an unknown or unmapped country code, When resolved, Then null is returned', () => {
    expect(getAdapterPlugType('ZZ')).toBeNull();
  });

  it('Given no country code, When resolved, Then null is returned', () => {
    expect(getAdapterPlugType(null)).toBeNull();
    expect(getAdapterPlugType(undefined)).toBeNull();
    expect(getAdapterPlugType('')).toBeNull();
  });
});
