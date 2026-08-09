import { DayItinerary } from '../types';

const UV_HIGH_THRESHOLD = 6;

/** True when any day in the itinerary has measurable forecast precipitation. */
export function needsUmbrella(itinerary: DayItinerary[]): boolean {
  return itinerary.some((day) => (day.precipitationMm ?? 0) > 0);
}

/** True when any day's forecast UV index reaches the "high" WHO band (6+). */
export function needsSunProtection(itinerary: DayItinerary[]): boolean {
  return itinerary.some((day) => (day.uvIndexMax ?? 0) >= UV_HIGH_THRESHOLD);
}
