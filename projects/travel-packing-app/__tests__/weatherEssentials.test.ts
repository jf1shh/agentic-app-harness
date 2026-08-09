import { describe, it, expect } from 'vitest';
import { needsUmbrella, needsSunProtection } from '../src/utils/weatherEssentials';
import { DayItinerary } from '../src/types';

const day = (overrides: Partial<DayItinerary> = {}): DayItinerary => ({
  dayNumber: 1,
  weatherWarmthTarget: 5,
  activity: 'sightseeing',
  ...overrides,
});

describe('needsUmbrella', () => {
  it('Given a trip with a rainy day, When checked, Then an umbrella is needed', () => {
    expect(needsUmbrella([day({ precipitationMm: 0 }), day({ precipitationMm: 4.2 })])).toBe(true);
  });

  it('Given a trip with no precipitation on any day, When checked, Then an umbrella is not needed', () => {
    expect(needsUmbrella([day({ precipitationMm: 0 }), day({ precipitationMm: 0 })])).toBe(false);
  });

  it('Given a trip with no precipitation data at all, When checked, Then an umbrella is not needed', () => {
    expect(needsUmbrella([day(), day()])).toBe(false);
  });

  it('Given an empty itinerary, When checked, Then an umbrella is not needed', () => {
    expect(needsUmbrella([])).toBe(false);
  });
});

describe('needsSunProtection', () => {
  it('Given a trip with a high-UV day (UV index 6+), When checked, Then sun protection is needed', () => {
    expect(needsSunProtection([day({ uvIndexMax: 3 }), day({ uvIndexMax: 7.5 })])).toBe(true);
  });

  it('Given a trip where every day stays under UV index 6, When checked, Then sun protection is not needed', () => {
    expect(needsSunProtection([day({ uvIndexMax: 5.9 }), day({ uvIndexMax: 2 })])).toBe(false);
  });

  it('Given a day exactly at the UV index 6 boundary, When checked, Then sun protection is needed', () => {
    expect(needsSunProtection([day({ uvIndexMax: 6 })])).toBe(true);
  });

  it('Given no UV data at all, When checked, Then sun protection is not needed', () => {
    expect(needsSunProtection([day(), day()])).toBe(false);
  });
});
