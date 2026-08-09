import { describe, it, expect } from 'vitest';
import { calculateWarmthTarget, transformWeatherToItinerary } from '../src/services/weatherApi';

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

  it('Given no per-day activities, When transformed, Then every day falls back to the single default activity', () => {
    const mockMeteoResponse = {
      time: ['2026-08-01', '2026-08-02'],
      temperature_2m_max: [30, 15],
      temperature_2m_min: [20, 10],
      precipitation_sum: [0, 5],
    };
    const itinerary = transformWeatherToItinerary(mockMeteoResponse, 'transit');
    expect(itinerary[0].activity).toBe('transit');
    expect(itinerary[1].activity).toBe('transit');
  });

  it('Given a per-day activities array, When transformed, Then each day carries its own tagged activity instead of one blanket default', () => {
    const mockMeteoResponse = {
      time: ['2026-08-01', '2026-08-02', '2026-08-03'],
      temperature_2m_max: [30, 15, 20],
      temperature_2m_min: [20, 10, 12],
      precipitation_sum: [0, 5, 0],
    };
    const itinerary = transformWeatherToItinerary(mockMeteoResponse, 'sightseeing', ['beach', 'formal', 'hike']);
    expect(itinerary.map((d) => d.activity)).toEqual(['beach', 'formal', 'hike']);
  });

  it('Given a per-day activities array shorter than the trip, When transformed, Then the missing days fall back to the default activity', () => {
    const mockMeteoResponse = {
      time: ['2026-08-01', '2026-08-02'],
      temperature_2m_max: [30, 15],
      temperature_2m_min: [20, 10],
      precipitation_sum: [0, 5],
    };
    const itinerary = transformWeatherToItinerary(mockMeteoResponse, 'sightseeing', ['beach']);
    expect(itinerary[0].activity).toBe('beach');
    expect(itinerary[1].activity).toBe('sightseeing');
  });
});
