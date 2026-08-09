import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateWarmthTarget, transformWeatherToItinerary, searchLocations, geocodeViaNominatim } from '../src/services/weatherApi';

describe('weatherApi logic', () => {
  it('Given a forecast temperature, When the warmth target is calculated, Then colder days demand a higher warmth rating', () => {
    // 40C (104F) -> 1
    expect(calculateWarmthTarget(40)).toBe(1);
    
    // 15C (59F) -> 10 - ((25)/50)*9 = 10 - 4.5 = 5.5 => 6
    expect(calculateWarmthTarget(15)).toBe(6);

    // -10C (14F) -> 10
    expect(calculateWarmthTarget(-10)).toBe(10);
  });

  it('Given a raw open-meteo forecast response, When it is transformed, Then it becomes a valid day-by-day itinerary', () => {
    const mockMeteoResponse = {
      time: ['2026-08-01', '2026-08-02'],
      temperature_2m_max: [30, 15],
      temperature_2m_min: [20, 10],
      precipitation_sum: [0, 5]
    };

    const itinerary = transformWeatherToItinerary(mockMeteoResponse);
    
    expect(itinerary).toHaveLength(2);
    expect(itinerary[0].dayNumber).toBe(1);
    expect(itinerary[0].weatherWarmthTarget).toBe(3); // 30C -> 3
    expect(itinerary[1].dayNumber).toBe(2);
    expect(itinerary[1].weatherWarmthTarget).toBe(6); // 15C -> 6
  });
});

describe('searchLocations', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Given a query shorter than 2 characters, When locations are searched, Then no request is made and an empty list is returned', async () => {
    const result = await searchLocations('a');
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Given a query that looks like raw coordinates, When locations are searched, Then no request is made — coordinates need no autocomplete', async () => {
    const result = await searchLocations('40.71, -74.00');
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Given a valid query, When locations are searched, Then it requests Open-Meteo (never Nominatim, per its no-autocomplete policy) and returns the results', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ name: 'Paris', latitude: 48.85, longitude: 2.35, country_code: 'FR' }] }),
    });
    const result = await searchLocations('Par');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('geocoding-api.open-meteo.com'));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Paris');
  });

  it('Given the API returns no results field, When locations are searched, Then an empty array is returned rather than throwing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await searchLocations('Xyzzy')).toEqual([]);
  });

  it('Given the fetch rejects, When locations are searched, Then an empty array is returned rather than throwing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
    expect(await searchLocations('Paris')).toEqual([]);
  });
});

describe('geocodeViaNominatim', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Given a Nominatim result with address details, When geocoded, Then the country code is extracted and uppercased', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: '48.85', lon: '2.35',
        display_name: 'Paris, France',
        address: { city: 'Paris', country: 'France', country_code: 'fr' },
      }],
    });
    const result = await geocodeViaNominatim('Paris');
    expect(result?.country_code).toBe('FR');
    expect(result?.name).toBe('Paris');
  });

  it('Given a Nominatim result with no city/town/village in its address, When geocoded, Then it falls back to the first segment of the display name', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: '48.85', lon: '2.35',
        display_name: 'Some Landmark, Some Region, France',
        address: { country: 'France', country_code: 'fr' },
      }],
    });
    const result = await geocodeViaNominatim('Some Landmark');
    expect(result?.name).toBe('Some Landmark');
  });
});
