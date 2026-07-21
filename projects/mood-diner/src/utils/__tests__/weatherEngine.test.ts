import { describe, it, expect } from 'vitest';
import { evaluateWeatherSuitability } from '../weatherEngine';
import { Restaurant, WeatherCondition } from '../../types';

const sampleHotSoupRestaurant: Restaurant = {
  id: 'soup-1',
  name: 'Tokyo Tonkotsu Ramen & Hot Pot',
  tagline: 'Steaming piping hot ramen stews',
  cuisine: 'Japanese Ramen & Hot Pot',
  occasions: ['Casual', 'Late Night'],
  moods: ['Cozy'],
  aggregateScore: {
    compositeScore: 4.7,
    google: { rating: 4.8, reviewCount: 900 },
    yelp: { rating: 4.6, reviewCount: 750 },
    sentimentSummary: 'Stellar hot ramen',
  },
  websiteUrl: 'https://tokyoramenhouse.com',
  verifiedWebsiteStatus: 'Verified Open',
  openingHours: { Tuesday: { openHour: 11, closeHour: 23 } },
  menu: [
    { id: 'm1', name: 'Ultra Spicy Pork Ramen Soup', description: 'Boiling hot pork broth', price: 18.5, category: 'Mains', isHotDish: true },
    { id: 'm2', name: 'Kimchi Hot Pot Stew', description: 'Bubbling spicy hot stew', price: 22.0, category: 'Mains', isHotDish: true },
  ],
  busyHours: [],
  address: '123 Noodle St',
  distanceMiles: 0.5,
  walkTimeMinutes: 10,
  driveTimeMinutes: 3,
  outdoorSeating: false,
  hasFireplace: false,
  heroImage: '',
  priceRange: '$$',
};

const sampleSummerPatioRestaurant: Restaurant = {
  id: 'patio-1',
  name: 'Sunset Ocean Roof & Sushi',
  tagline: 'Rooftop dining with breeze & sushi',
  cuisine: 'Seafood & Sushi Bar',
  occasions: ['Anniversary', 'First Date'],
  moods: ['Romantic', 'Outdoor Patio'],
  aggregateScore: {
    compositeScore: 4.9,
    google: { rating: 4.9, reviewCount: 1200 },
    yelp: { rating: 4.8, reviewCount: 1100 },
    sentimentSummary: 'Amazing views & fresh sushi',
  },
  websiteUrl: 'https://sunsetsushi.com',
  verifiedWebsiteStatus: 'Verified Open',
  openingHours: { Tuesday: { openHour: 12, closeHour: 24 } },
  menu: [
    { id: 'm3', name: 'Chilled Tuna Tataki & Sashimi', description: 'Fresh ice-chilled tuna', price: 24.0, category: 'Mains', isColdDish: true },
    { id: 'm4', name: 'Artisanal Ice Cream Parfait', description: 'Cold summer dessert', price: 12.0, category: 'Desserts', isColdDish: true },
  ],
  busyHours: [],
  address: '456 Coastal Blvd',
  distanceMiles: 1.2,
  walkTimeMinutes: 22,
  driveTimeMinutes: 5,
  outdoorSeating: true,
  hasFireplace: false,
  heroImage: '',
  priceRange: '$$$',
};

describe('weatherEngine', () => {
  it('discourages hot soup restaurants during 92°F hot summer weather', () => {
    const hotSummer: WeatherCondition = {
      temperatureF: 92,
      condition: 'Hot',
      season: 'Summer',
      summary: 'Sweltering hot summer day',
    };

    const result = evaluateWeatherSuitability(sampleHotSoupRestaurant, hotSummer);
    expect(result.isWeatherDiscouraged).toBe(true);
    expect(result.weatherMatchScore).toBeLessThan(60);
    expect(result.weatherNote).toContain('Hot weather');
  });

  it('boosts outdoor rooftop sushi bars during hot summer weather', () => {
    const hotSummer: WeatherCondition = {
      temperatureF: 92,
      condition: 'Hot',
      season: 'Summer',
      summary: 'Sweltering hot summer day',
    };

    const result = evaluateWeatherSuitability(sampleSummerPatioRestaurant, hotSummer);
    expect(result.isWeatherDiscouraged).toBe(false);
    expect(result.weatherMatchScore).toBeGreaterThanOrEqual(90);
    expect(result.weatherNote).toContain('chilled options');
  });

  it('boosts hot soup and ramen during 35°F freezing winter weather', () => {
    const coldWinter: WeatherCondition = {
      temperatureF: 35,
      condition: 'Cold',
      season: 'Winter',
      summary: 'Freezing winter weather',
    };

    const result = evaluateWeatherSuitability(sampleHotSoupRestaurant, coldWinter);
    expect(result.isWeatherDiscouraged).toBe(false);
    expect(result.weatherMatchScore).toBeGreaterThanOrEqual(90);
    expect(result.weatherNote).toContain('winter warmth');
  });
});
