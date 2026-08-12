import { describe, it, expect } from 'vitest';
import { isRestaurantOpenNow, formatOpeningHours } from '../openStatus';
import { Restaurant } from '../../types';

const mockRestaurant: Restaurant = {
  id: 'rest-1',
  name: 'Lustra Bistro',
  tagline: 'French bistro',
  cuisine: 'French',
  occasions: ['Anniversary'],
  moods: ['Romantic'],
  aggregateScore: {
    compositeScore: 4.8,
    google: { rating: 4.8, reviewCount: 500 },
    yelp: { rating: 4.7, reviewCount: 400 },
    sentimentSummary: 'Excellent',
  },
  websiteUrl: 'https://lustrabistro.com',
  verifiedWebsiteStatus: 'Verified Open',
  openingHours: {
    Tuesday: { openHour: 11, closeHour: 22 },
  },
  menu: [],
  busyHours: [],
  address: '100 Main St',
  distanceMiles: 0.5,
  walkTimeMinutes: 10,
  driveTimeMinutes: 3,
  outdoorSeating: true,
  hasFireplace: false,
  heroImage: '',
  priceRange: '$$$',
};

describe('openStatus', () => {
  it('Given a restaurant trading 11 AM to 10 PM, When the time is 2 PM that day, Then it reports as open', () => {
    expect(isRestaurantOpenNow(mockRestaurant, 'Tuesday', 14)).toBe(true);
  });

  it('Given a restaurant trading 11 AM to 10 PM, When the time is before opening or after closing, Then it reports as closed', () => {
    expect(isRestaurantOpenNow(mockRestaurant, 'Tuesday', 9)).toBe(false);
    expect(isRestaurantOpenNow(mockRestaurant, 'Tuesday', 23)).toBe(false);
  });

  it('Given a trading day with an opening-hours range, When those hours are formatted, Then they read as "11 AM - 10 PM"', () => {
    expect(formatOpeningHours(mockRestaurant, 'Tuesday')).toBe('11 AM - 10 PM');
  });

  // Mutation testing (node scripts/run-mutation.mjs mood-diner --mutate
  // "src/utils/openStatus.ts") found the late-night-closing branch and every
  // formatOpeningHours edge case entirely NoCoverage.

  it('Given a restaurant with no schedule at all for that day, When checked, Then it reports as closed', () => {
    expect(isRestaurantOpenNow(mockRestaurant, 'Sunday', 14)).toBe(false);
  });

  it('Given a restaurant trading past midnight (5 PM to 2 AM), When the time is late night or just before opening, Then it reports as open across the midnight boundary and closed in between', () => {
    const lateNight: Restaurant = {
      ...mockRestaurant,
      openingHours: { Tuesday: { openHour: 17, closeHour: 2 } },
    };
    expect(isRestaurantOpenNow(lateNight, 'Tuesday', 23)).toBe(true); // late evening
    expect(isRestaurantOpenNow(lateNight, 'Tuesday', 1)).toBe(true); // after midnight, before close
    expect(isRestaurantOpenNow(lateNight, 'Tuesday', 10)).toBe(false); // mid-afternoon, well closed
  });

  it('Given a day with no opening-hours entry, When the hours are formatted, Then it reads as "Closed today"', () => {
    expect(formatOpeningHours(mockRestaurant, 'Sunday')).toBe('Closed today');
  });

  it('Given hours starting or ending exactly at midnight, When formatted, Then they read as "12 AM"', () => {
    const midnight: Restaurant = { ...mockRestaurant, openingHours: { Tuesday: { openHour: 0, closeHour: 24 } } };
    expect(formatOpeningHours(midnight, 'Tuesday')).toBe('12 AM - 12 AM');
  });

  it('Given hours starting exactly at noon, When formatted, Then it reads as "12 PM" rather than "0 PM"', () => {
    const noon: Restaurant = { ...mockRestaurant, openingHours: { Tuesday: { openHour: 12, closeHour: 22 } } };
    expect(formatOpeningHours(noon, 'Tuesday')).toBe('12 PM - 10 PM');
  });
});
