import { describe, it, expect } from 'vitest';
import {
  loadCustomRestaurants,
  saveCustomRestaurants,
  loadReservations,
  saveReservations,
  CUSTOM_RESTAURANTS_KEY,
  RESERVATIONS_KEY,
} from './storage';
import type { Restaurant, Reservation } from '../types';

// Everything read back from localStorage is untrusted input by the time it's
// read back (.agents/AGENTS.md §1) — a hand-edited or stale payload must
// never crash the app or hand an invalid row (e.g. a javascript: websiteUrl)
// to a component that renders it unchecked.

class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const validRestaurant: Restaurant = {
  id: 'the-hearth',
  name: 'The Hearth',
  tagline: 'Fireside dining',
  cuisine: 'British',
  occasions: ['date-night'],
  moods: ['cosy'],
  aggregateScore: {
    compositeScore: 4.5,
    google: { rating: 4.5, reviewCount: 1200 },
    yelp: { rating: 4.4, reviewCount: 800 },
    sentimentSummary: 'Warm and inviting.',
  },
  websiteUrl: 'https://example.com',
  verifiedWebsiteStatus: 'Verified Open',
  openingHours: { Monday: { openHour: 12, closeHour: 23 } },
  menu: [],
  busyHours: [],
  address: '1 Example Street, London',
  distanceMiles: 1.2,
  walkTimeMinutes: 24,
  driveTimeMinutes: 8,
  outdoorSeating: true,
  hasFireplace: true,
  heroImage: 'https://images.unsplash.com/photo-1',
  priceRange: '$$$',
  isRealWorldVerified: true,
};

const validReservation: Reservation = {
  id: 'r1',
  restaurantId: 'the-hearth',
  restaurantName: 'The Hearth',
  date: '2026-03-01',
  time: '19:30',
  partySize: 4,
  occasion: 'Anniversary',
  specialRequests: '',
  seatingPreference: 'Window',
  status: 'Confirmed',
  createdAt: '2026-02-20T10:00:00.000Z',
};

describe('loadCustomRestaurants', () => {
  it('Given no stored value, When restaurants are loaded, Then an empty list is returned', () => {
    expect(loadCustomRestaurants(new FakeStorage())).toEqual([]);
  });

  it('Given a valid stored restaurant, When restaurants are loaded, Then it round-trips unchanged', () => {
    const storage = new FakeStorage();
    storage.setItem(CUSTOM_RESTAURANTS_KEY, JSON.stringify([validRestaurant]));
    expect(loadCustomRestaurants(storage)).toEqual([validRestaurant]);
  });

  it('Given syntactically invalid JSON, When restaurants are loaded, Then an empty list is returned rather than throwing', () => {
    const storage = new FakeStorage();
    storage.setItem(CUSTOM_RESTAURANTS_KEY, '{not valid json');
    expect(loadCustomRestaurants(storage)).toEqual([]);
  });

  it('Given a stored value that is not an array, When restaurants are loaded, Then an empty list is returned', () => {
    const storage = new FakeStorage();
    storage.setItem(CUSTOM_RESTAURANTS_KEY, JSON.stringify({ not: 'an array' }));
    expect(loadCustomRestaurants(storage)).toEqual([]);
  });

  it('Given one valid and one malformed restaurant, When restaurants are loaded, Then only the valid one is kept', () => {
    const storage = new FakeStorage();
    const malformed = { ...validRestaurant, id: 'bad', address: undefined };
    storage.setItem(CUSTOM_RESTAURANTS_KEY, JSON.stringify([validRestaurant, malformed]));
    const loaded = loadCustomRestaurants(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('the-hearth');
  });

  it('Given a stored restaurant whose websiteUrl is a javascript: URI, When restaurants are loaded, Then it is dropped', () => {
    // A hand-edited or tampered payload must never let a non-http(s) scheme
    // reach the <a href> that renders it (RestaurantCard, RestaurantModal).
    const storage = new FakeStorage();
    const tampered = { ...validRestaurant, id: 'tampered', websiteUrl: 'javascript:alert(1)' };
    storage.setItem(CUSTOM_RESTAURANTS_KEY, JSON.stringify([tampered]));
    expect(loadCustomRestaurants(storage)).toEqual([]);
  });
});

describe('saveCustomRestaurants', () => {
  it('Given a list of restaurants, When they are saved, Then they are written as JSON under the custom-restaurants key', () => {
    const storage = new FakeStorage();
    saveCustomRestaurants(storage, [validRestaurant]);
    expect(JSON.parse(storage.getItem(CUSTOM_RESTAURANTS_KEY)!)).toEqual([validRestaurant]);
  });

  it('Given a storage.setItem that throws, When restaurants are saved, Then the error is caught rather than propagating', () => {
    const throwing = { getItem: () => null, setItem: () => { throw new Error('quota exceeded'); } };
    expect(() => saveCustomRestaurants(throwing, [validRestaurant])).not.toThrow();
  });
});

describe('loadReservations', () => {
  it('Given no stored value, When reservations are loaded, Then an empty list is returned', () => {
    expect(loadReservations(new FakeStorage())).toEqual([]);
  });

  it('Given a valid stored reservation, When reservations are loaded, Then it round-trips unchanged', () => {
    const storage = new FakeStorage();
    storage.setItem(RESERVATIONS_KEY, JSON.stringify([validReservation]));
    expect(loadReservations(storage)).toEqual([validReservation]);
  });

  it('Given a stored reservation with an invalid seatingPreference, When reservations are loaded, Then it is dropped', () => {
    const storage = new FakeStorage();
    const malformed = { ...validReservation, seatingPreference: 'Rooftop' };
    storage.setItem(RESERVATIONS_KEY, JSON.stringify([malformed]));
    expect(loadReservations(storage)).toEqual([]);
  });
});

describe('saveReservations', () => {
  it('Given a list of reservations, When they are saved, Then they are written as JSON under the reservations key', () => {
    const storage = new FakeStorage();
    saveReservations(storage, [validReservation]);
    expect(JSON.parse(storage.getItem(RESERVATIONS_KEY)!)).toEqual([validReservation]);
  });
});
