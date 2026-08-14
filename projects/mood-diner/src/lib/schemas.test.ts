import { describe, it, expect } from 'vitest';
import {
  RestaurantSchema,
  MenuItemSchema,
  WeatherStateSchema,
  BookingDetailsSchema,
  AggregateScoreSchema,
  OpeningHourRangeSchema,
  ReservationSchema,
} from './schemas';
import { INITIAL_RESTAURANTS } from '../data/restaurantsData';

// Contract-first mandate (.agents/AGENTS.md §1). These schemas guard two real
// boundaries: the restaurant dataset (including rows a user imports via the
// "Add Real Restaurant" modal) and bookings round-tripped through localStorage.
// Both are untrusted input by the time they are read back.
//
// Backfilled coverage (§5): no Red step, so every case was proved by mutating
// the schema — see the PR body.

const validSourceRating = { rating: 4.5, reviewCount: 1200 };

const validAggregate = {
  compositeScore: 4.4,
  google: validSourceRating,
  yelp: validSourceRating,
  tripAdvisor: validSourceRating,
  sentimentSummary: 'Consistently warm service and a lively room.',
  reviewComments: [
    {
      id: 'r1',
      source: 'Google',
      author: 'A. Diner',
      rating: 5,
      date: '2026-02-11',
      commentText: 'Cosy corner table by the fire.',
      detectedMoods: ['cosy', 'romantic'],
    },
  ],
};

const validMenuItem = {
  id: 'm1',
  name: 'Sunday Roast',
  description: 'Dry-aged sirloin, duck-fat potatoes.',
  price: 28.5,
  category: 'Mains' as const,
};

const validRestaurant = {
  id: 'the-hearth',
  name: 'The Hearth',
  tagline: 'Fireside dining',
  cuisine: 'British',
  occasions: ['date-night'],
  moods: ['cosy'],
  aggregateScore: validAggregate,
  websiteUrl: 'https://example.com',
  verifiedWebsiteStatus: 'Verified Open' as const,
  openingHours: { monday: { openHour: 12, closeHour: 23 } },
  menu: [validMenuItem],
  busyHours: [{ hour: 19, occupancyPercent: 85, label: 'Peak', vibe: 'Peak & Lively' as const }],
  address: '1 Example Street, London',
  distanceMiles: 1.2,
  walkTimeMinutes: 24,
  hasFireplace: true,
  heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
  priceRange: '$$$' as const,
  driveTimeMinutes: 7,
  outdoorSeating: true,
  isRealWorldVerified: true,
};

// Omit a key without leaving an unused binding behind: the usual
// `const { key: _unused, ...rest } = obj` idiom trips
// @typescript-eslint/no-unused-vars, which these apps lint with no ^_ ignore
// pattern and --max-warnings 0.
function without<T extends object>(obj: T, key: keyof T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  delete copy[key as string];
  return copy;
}

describe('MenuItemSchema', () => {
  it('Given a complete menu item, When it is parsed, Then it is accepted unchanged', () => {
    expect(MenuItemSchema.parse(validMenuItem)).toEqual(validMenuItem);
  });

  it.each(['Appetizers', 'Mains', 'Desserts', 'Drinks'])(
    'Given the declared category %s, When a menu item is parsed, Then it is accepted',
    (category) => {
      expect(MenuItemSchema.parse({ ...validMenuItem, category }).category).toBe(category);
    },
  );

  it('Given a category outside the declared union, When it is parsed, Then the contract rejects it', () => {
    // The modal groups the menu by category; an unlisted one renders nowhere.
    expect(() => MenuItemSchema.parse({ ...validMenuItem, category: 'Sides' })).toThrow();
  });

  it('Given a price that arrived as a string, When it is parsed, Then it is rejected rather than coerced', () => {
    expect(() => MenuItemSchema.parse({ ...validMenuItem, price: '28.50' })).toThrow();
  });

  it('Given the optional dietary and temperature flags, When they are omitted, Then the item is still valid', () => {
    const parsed = MenuItemSchema.parse(validMenuItem);
    expect(parsed.dietary).toBeUndefined();
    expect(parsed.isColdDish).toBeUndefined();
  });
});

describe('WeatherStateSchema', () => {
  it.each(['Sunny', 'Rainy', 'Snowy', 'Clear Night', 'Hot Summer'])(
    'Given the declared condition %s, When weather is parsed, Then it is accepted',
    (condition) => {
      const parsed = WeatherStateSchema.parse({
        tempF: 68, condition, label: 'Mild', humidityPercent: 55,
      });
      expect(parsed.condition).toBe(condition);
    },
  );

  it('Given a condition outside the declared union, When it is parsed, Then the contract rejects it', () => {
    // The recommendation engine switches on condition; an unknown one would
    // fall through every branch and score no restaurant.
    expect(() => WeatherStateSchema.parse({
      tempF: 68, condition: 'Foggy', label: 'Murky', humidityPercent: 90,
    })).toThrow();
  });
});

describe('OpeningHourRangeSchema and AggregateScoreSchema', () => {
  it('Given an opening-hours range, When it is parsed, Then both bounds are required numbers', () => {
    expect(OpeningHourRangeSchema.parse({ openHour: 12, closeHour: 23 }))
      .toEqual({ openHour: 12, closeHour: 23 });
    expect(() => OpeningHourRangeSchema.parse({ openHour: 12 })).toThrow();
  });

  it('Given an aggregate score, When the optional sources are omitted, Then the three required ones still apply', () => {
    const parsed = AggregateScoreSchema.parse(validAggregate);
    expect(parsed.michelin).toBeUndefined();
    expect(() => AggregateScoreSchema.parse(without(validAggregate, 'yelp'))).toThrow();
  });

  it('Given an aggregate score whose review comments are malformed, When it is parsed, Then the nested contract still applies', () => {
    expect(() => AggregateScoreSchema.parse({
      ...validAggregate,
      reviewComments: [{ ...validAggregate.reviewComments[0], detectedMoods: 'cosy' }],
    })).toThrow();
  });
});

describe('RestaurantSchema', () => {
  it('Given a complete restaurant, When it is parsed, Then it is accepted unchanged', () => {
    expect(RestaurantSchema.parse(validRestaurant)).toEqual(validRestaurant);
  });

  it('Given a restaurant missing a required field, When it is parsed, Then the contract rejects it', () => {
    expect(() => RestaurantSchema.parse(without(validRestaurant, 'address'))).toThrow();
  });

  it('Given a restaurant whose nested menu item is invalid, When it is parsed, Then the nested contract still applies', () => {
    expect(() => RestaurantSchema.parse({
      ...validRestaurant,
      menu: [{ ...validMenuItem, category: 'Sides' }],
    })).toThrow();
  });

  it('Given openingHours keyed by day, When it is parsed, Then each value must be a full range', () => {
    expect(() => RestaurantSchema.parse({
      ...validRestaurant,
      openingHours: { monday: { openHour: 12 } },
    })).toThrow();
  });

  it('Given isRealWorldVerified omitted, When it is parsed, Then the restaurant is still valid', () => {
    // Only AddRealRestaurantModal sets this flag; the shipped dataset omits
    // it entirely, so absent must not be mistaken for a malformed row.
    const parsed = RestaurantSchema.parse(without(validRestaurant, 'isRealWorldVerified'));
    expect(parsed.isRealWorldVerified).toBeUndefined();
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'not a url',
  ])(
    'Given a websiteUrl of %s, When it is parsed, Then the contract rejects it',
    (websiteUrl) => {
      // websiteUrl is rendered directly as an <a href> (RestaurantCard,
      // RestaurantModal); a restaurant round-tripped through localStorage is
      // untrusted input by the time it's read back (.agents/AGENTS.md §1),
      // so a non-http(s) scheme must never reach the contract's output.
      expect(() => RestaurantSchema.parse({ ...validRestaurant, websiteUrl })).toThrow();
    },
  );

  it('Given a websiteUrl with an http(s) scheme, When it is parsed, Then it is accepted', () => {
    expect(RestaurantSchema.parse({ ...validRestaurant, websiteUrl: 'http://example.com' }).websiteUrl)
      .toBe('http://example.com');
  });
});

describe('ReservationSchema', () => {
  const validReservation = {
    id: 'r1',
    restaurantId: 'the-hearth',
    restaurantName: 'The Hearth',
    date: '2026-03-01',
    time: '19:30',
    partySize: 4,
    occasion: 'Anniversary',
    specialRequests: 'Window seat if possible',
    seatingPreference: 'Window' as const,
    status: 'Confirmed' as const,
    createdAt: '2026-02-20T10:00:00.000Z',
  };

  it('Given a reservation round-tripped through storage, When it is parsed, Then it is accepted unchanged', () => {
    expect(ReservationSchema.parse(validReservation)).toEqual(validReservation);
  });

  it('Given a reservation missing a required field, When it is parsed, Then the contract rejects it', () => {
    expect(() => ReservationSchema.parse(without(validReservation, 'restaurantId'))).toThrow();
  });

  it('Given a seatingPreference outside the declared union, When it is parsed, Then the contract rejects it', () => {
    expect(() => ReservationSchema.parse({ ...validReservation, seatingPreference: 'Rooftop' })).toThrow();
  });

  it('Given a partySize that arrived as a string, When it is parsed, Then it is rejected rather than coerced', () => {
    expect(() => ReservationSchema.parse({ ...validReservation, partySize: '4' })).toThrow();
  });
});

describe('BookingDetailsSchema', () => {
  it('Given a booking round-tripped through storage, When it is parsed, Then it is accepted unchanged', () => {
    const booking = {
      id: 'b1',
      restaurantId: 'the-hearth',
      restaurantName: 'The Hearth',
      date: '2026-03-01',
      time: '19:30',
      guests: 4,
      createdAt: '2026-02-20T10:00:00.000Z',
    };
    expect(BookingDetailsSchema.parse(booking)).toEqual(booking);
  });

  it('Given a booking whose guest count arrived as a string, When it is parsed, Then it is rejected rather than coerced', () => {
    // A *numeric* string is the case that matters: 'four' fails under coercion
    // too, so asserting it would pass whether or not the contract coerces, and
    // a booking form posting "4" is exactly how a coerced field slips through.
    const booking = {
      id: 'b1', restaurantId: 'x', restaurantName: 'X', date: '2026-03-01',
      time: '19:30', createdAt: '2026-02-20T10:00:00.000Z',
    };
    expect(() => BookingDetailsSchema.parse({ ...booking, guests: '4' })).toThrow();
    expect(() => BookingDetailsSchema.parse({ ...booking, guests: 'four' })).toThrow();
  });
});

describe('the shipped restaurant dataset', () => {
  it('Given the real INITIAL_RESTAURANTS, When every row is parsed through the contract, Then all of them conform', () => {
    expect(INITIAL_RESTAURANTS.length).toBeGreaterThan(0);
    for (const restaurant of INITIAL_RESTAURANTS) {
      expect(() => RestaurantSchema.parse(restaurant)).not.toThrow();
    }
  });

  it('Given the real INITIAL_RESTAURANTS, When ids are collected, Then each restaurant has a unique id', () => {
    const ids = INITIAL_RESTAURANTS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
