const COORD_REGEX = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  country?: string;
  country_code?: string;
}

export const geocodeViaNominatim = async (locationName: string) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=jsonv2&addressdetails=1&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    const address: NominatimAddress = item.address || {};
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      latitude: lat,
      longitude: lon,
      name: address.city || address.town || address.village || address.municipality
        || (item.display_name ? String(item.display_name).split(',')[0] : locationName),
      country: address.country || 'Unknown',
      country_code: address.country_code ? address.country_code.toUpperCase() : undefined,
    };
  } catch {
    return null;
  }
};

const AUTOCOMPLETE_COORD_REGEX = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;

export interface LocationSuggestion {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
}

/**
 * Live destination suggestions for an autocomplete dropdown. Uses only
 * Open-Meteo's geocoding search (never Nominatim -- its usage policy
 * explicitly forbids client-side autocomplete: "you must not implement
 * such a service on the client side using the API",
 * https://operations.osmfoundation.org/policies/nominatim/).
 */
export const searchLocations = async (query: string, count: number = 5): Promise<LocationSuggestion[]> => {
  const trimmed = (query || '').trim();
  if (trimmed.length < 2 || AUTOCOMPLETE_COORD_REGEX.test(trimmed)) return [];
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=${count}&language=en&format=json`);
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
};

export const geocodeLocation = async (locationName: string): Promise<LocationSuggestion> => {
  try {
    const match = locationName.match(COORD_REGEX);
    if (match) {
      return { latitude: parseFloat(match[1]), longitude: parseFloat(match[3]), name: locationName };
    }

    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`);
    let result: LocationSuggestion | null = null;
    if (response.ok) {
      const data = await response.json();
      result = data.results && data.results.length > 0 ? data.results[0] : null;
    }

    // A non-ok response (rate limit, transient 5xx) must not skip the
    // Nominatim fallback — parsing its error body would either throw on a
    // non-JSON page or trust a response that is not a successful geocode.
    if (!result) {
      result = await geocodeViaNominatim(locationName);
    }

    if (result) return result;
    throw new Error('Location not found');
  } catch (error) {
    console.error("Geocoding Error:", error);
    throw error;
  }
};

const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const fetchWeather = async (lat: number, lon: number, startDateStr: string, endDateStr: string) => {
  try {
    // For V4 Phase 1, we will just use the forecast API (we can add the climate archive fallback later if needed)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=${startDateStr}&end_date=${endDateStr}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) throw new Error(data.reason || 'Weather API Error');
    if (!data.daily) throw new Error('Weather data not available for these dates');
    
    return data.daily;
  } catch (error) {
    console.error("Weather Fetch Error:", error);
    // Fallback to mild weather so app doesn't crash. The day count is
    // clamped to at least one valid day: a reversed date range (end before
    // start) or unparseable date strings would otherwise compute a negative
    // or NaN length, and `Array(negative)`/`Array(NaN)` throws a RangeError
    // out of this very catch block, replacing a recoverable fetch failure
    // with a confusing "Invalid array length" crash.
    const startMs = new Date(startDateStr).getTime();
    const endMs = new Date(endDateStr).getTime();
    const rawDays = Math.ceil((endMs - startMs) / (1000 * 3600 * 24)) + 1;
    const days = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 1;
    const base = Number.isFinite(startMs) ? new Date(startDateStr) : new Date();
    return {
      time: Array.from({ length: days }, (_, i) => toDateStr(addDays(base, i))),
      temperature_2m_max: Array(days).fill(20),
      temperature_2m_min: Array(days).fill(10),
      precipitation_sum: Array(days).fill(0)
    };
  }
};

import { DayItinerary } from '../types';
import { DestinationLeg } from '../utils/multiDestination';

export function calculateWarmthTarget(maxTempC: number): number {
  let warmth = 10 - ((maxTempC + 10) / 50) * 9;
  warmth = Math.max(1, Math.min(10, Math.round(warmth)));
  return warmth;
}

interface DailyWeather {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
}

export function transformWeatherToItinerary(
  dailyWeather: DailyWeather,
  defaultActivity: string = 'sightseeing',
  dailyActivities?: string[]
): DayItinerary[] {
  if (!dailyWeather || !dailyWeather.time || !dailyWeather.temperature_2m_max) return [];

  const temps = dailyWeather.temperature_2m_max;

  return dailyWeather.time.map((dateStr: string, index: number) => {
    const maxTempC = temps[index];
    const target = calculateWarmthTarget(maxTempC);

    return {
      dayNumber: index + 1,
      weatherWarmthTarget: target,
      activity: dailyActivities?.[index] ?? defaultActivity,
      maxTempC: maxTempC
    };
  });
}

export interface LegItineraryResult {
  itinerary: DayItinerary[];
  countryCode: string | null;
}

/**
 * Geocodes and fetches weather for a single leg of a multi-destination trip,
 * then tags every resulting day with that leg's destination and offsets its
 * dayNumber so a multi-leg itinerary numbers its days once, continuously,
 * across the whole trip rather than restarting at 1 per leg.
 */
export async function fetchLegItinerary(
  leg: DestinationLeg,
  dayNumberOffset: number,
  defaultActivity: string,
  dailyActivitiesForLeg?: string[]
): Promise<LegItineraryResult> {
  const geo = await geocodeLocation(leg.destination);
  const countryCode = 'country_code' in geo && geo.country_code ? geo.country_code : null;
  const weather = await fetchWeather(geo.latitude, geo.longitude, leg.startDate, leg.endDate);
  const itinerary = transformWeatherToItinerary(weather, defaultActivity, dailyActivitiesForLeg).map((day) => ({
    ...day,
    dayNumber: day.dayNumber + dayNumberOffset,
    destinationName: leg.destination,
  }));
  return { itinerary, countryCode };
}
