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
  it('correctly identifies open hours during operating hours', () => {
    expect(isRestaurantOpenNow(mockRestaurant, 'Tuesday', 14)).toBe(true);
  });

  it('correctly identifies closed status outside operating hours', () => {
    expect(isRestaurantOpenNow(mockRestaurant, 'Tuesday', 9)).toBe(false);
    expect(isRestaurantOpenNow(mockRestaurant, 'Tuesday', 23)).toBe(false);
  });

  it('formats opening hours string nicely', () => {
    expect(formatOpeningHours(mockRestaurant, 'Tuesday')).toBe('11 AM - 10 PM');
  });
});
