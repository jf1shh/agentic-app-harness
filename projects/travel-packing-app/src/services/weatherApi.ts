const COORD_REGEX = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/;

export const geocodeViaNominatim = async (locationName: string) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=jsonv2&addressdetails=1&limit=1`);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const item = data[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { latitude: lat, longitude: lon, name: locationName };
  } catch {
    return null;
  }
};

export const geocodeLocation = async (locationName: string) => {
  try {
    const match = locationName.match(COORD_REGEX);
    if (match) {
      return { latitude: parseFloat(match[1]), longitude: parseFloat(match[3]), name: locationName };
    }

    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`);
    const data = await response.json();
    let result = data.results && data.results.length > 0 ? data.results[0] : null;

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
    // Fallback to mild weather so app doesn't crash
    const days = Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 3600 * 24)) + 1;
    return {
      time: Array.from({length: days}, (_, i) => toDateStr(addDays(new Date(startDateStr), i))),
      temperature_2m_max: Array(days).fill(20),
      temperature_2m_min: Array(days).fill(10),
      precipitation_sum: Array(days).fill(0)
    };
  }
};

import { DayItinerary } from '../types';

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

export function transformWeatherToItinerary(dailyWeather: DailyWeather, defaultActivity: string = 'sightseeing'): DayItinerary[] {
  if (!dailyWeather || !dailyWeather.time || !dailyWeather.temperature_2m_max) return [];
  
  const temps = dailyWeather.temperature_2m_max;
  
  return dailyWeather.time.map((dateStr: string, index: number) => {
    const maxTempC = temps[index];
    const target = calculateWarmthTarget(maxTempC);
    
    return {
      dayNumber: index + 1,
      weatherWarmthTarget: target,
      activity: defaultActivity,
      maxTempC: maxTempC
    };
  });
}
