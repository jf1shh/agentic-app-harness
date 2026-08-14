/**
 * Local persistence boundary for user-entered restaurants and reservations.
 *
 * Both round-trip through localStorage, which is untrusted input the moment
 * it's read back (.agents/AGENTS.md §1) — a hand-edited, corrupted, or
 * stale-schema payload must never crash the app or hand an invalid row
 * (e.g. a `javascript:` websiteUrl) to a component that renders it
 * unchecked. Invalid entries are dropped individually rather than
 * discarding the whole list, so one bad row doesn't erase every restaurant
 * or reservation a user has saved.
 */
import { RestaurantSchema, ReservationSchema, type Restaurant, type Reservation } from './schemas';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const CUSTOM_RESTAURANTS_KEY = 'mood_diner_custom_restaurants';
export const RESERVATIONS_KEY = 'mood_diner_reservations';

interface ParseableSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

function loadValidatedArray<T>(storage: StorageLike, key: string, schema: ParseableSchema<T>): T[] {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const valid: T[] = [];
  for (const entry of parsed) {
    const result = schema.safeParse(entry);
    if (result.success) valid.push(result.data);
  }
  return valid;
}

function saveArray<T>(storage: StorageLike, key: string, values: T[]): void {
  try {
    storage.setItem(key, JSON.stringify(values));
  } catch (e) {
    console.error(`Failed to save to localStorage key "${key}"`, e);
  }
}

export function loadCustomRestaurants(storage: StorageLike): Restaurant[] {
  return loadValidatedArray(storage, CUSTOM_RESTAURANTS_KEY, RestaurantSchema);
}

export function saveCustomRestaurants(storage: StorageLike, restaurants: Restaurant[]): void {
  saveArray(storage, CUSTOM_RESTAURANTS_KEY, restaurants);
}

export function loadReservations(storage: StorageLike): Reservation[] {
  return loadValidatedArray(storage, RESERVATIONS_KEY, ReservationSchema);
}

export function saveReservations(storage: StorageLike, reservations: Reservation[]): void {
  saveArray(storage, RESERVATIONS_KEY, reservations);
}
