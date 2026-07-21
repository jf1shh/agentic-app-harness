import { describe, it, expect } from 'vitest';
import { calculateWarmthTarget, transformWeatherToItinerary } from '../src/services/weatherApi';

describe('weatherApi logic', () => {
  it('should calculate warmth target based on temperature', () => {
    // 40C (104F) -> 1
    expect(calculateWarmthTarget(40)).toBe(1);
    
    // 15C (59F) -> 10 - ((25)/50)*9 = 10 - 4.5 = 5.5 => 6
    expect(calculateWarmthTarget(15)).toBe(6);

    // -10C (14F) -> 10
    expect(calculateWarmthTarget(-10)).toBe(10);
  });

  it('should transform open-meteo response to a valid Itinerary array', () => {
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
