import { describe, it, expect } from 'vitest';
import { celsiusToFahrenheit, formatTemperature } from '../src/utils/temperature';

describe('celsiusToFahrenheit', () => {
  it('Given 0°C, When converted, Then it returns 32°F', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
  });

  it('Given 100°C, When converted, Then it returns 212°F', () => {
    expect(celsiusToFahrenheit(100)).toBe(212);
  });

  it('Given a negative Celsius value, When converted, Then it returns the correct negative Fahrenheit value', () => {
    expect(celsiusToFahrenheit(-10)).toBe(14);
  });

  it('Given a fractional Celsius value, When converted, Then the result is rounded to the nearest whole degree', () => {
    // 29.3 * 9/5 + 32 = 84.74, rounds to 85.
    expect(celsiusToFahrenheit(29.3)).toBe(85);
  });
});

describe('formatTemperature', () => {
  it('Given a Celsius value, When formatted, Then it renders both units with the Celsius value unrounded and the Fahrenheit value rounded', () => {
    expect(formatTemperature(30)).toBe('30°C / 86°F');
    expect(formatTemperature(29.3)).toBe('29.3°C / 85°F');
  });
});
