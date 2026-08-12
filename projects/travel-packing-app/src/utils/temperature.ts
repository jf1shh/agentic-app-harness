// Fahrenheit is display-only -- the itinerary engine and its DayItinerary
// schema keep maxTempC as the single source of truth (see
// specs/travel-packing-app-spec.md §4's DayItinerary interface), and every
// warmth/thermal calculation in wardrobeEngine/weatherApi stays in Celsius.
// This module only formats that one figure for readers who think in °F.
export function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function formatTemperature(maxTempC: number): string {
  return `${maxTempC}°C / ${celsiusToFahrenheit(maxTempC)}°F`;
}
