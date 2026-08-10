import { describe, it, expect } from 'vitest';
import { guessActivityFromDestination, resolveActivity, resolveDayActivity, ACTIVITY_OPTIONS } from '../src/utils/activity';

describe('guessActivityFromDestination', () => {
  it.each([
    ['Whistler', 'ski'],
    ['Aspen, Colorado', 'ski'],
    ['Maui, Hawaii', 'beach'],
    ['Tulum', 'beach'],
    ['Yosemite National Park', 'hike'],
    ['Las Vegas', 'nightout'],
    ['Corporate HQ Meeting', 'business'],
    ['Paris', 'sightseeing'],
  ])('Given a destination containing "%s", When the activity is guessed, Then it resolves to "%s"', (dest, expected) => {
    expect(guessActivityFromDestination(dest)).toBe(expected);
  });

  it('Given a destination matching no known keyword, When the activity is guessed, Then it returns an empty string rather than a wrong guess', () => {
    expect(guessActivityFromDestination('Springfield')).toBe('');
  });

  it('Given an empty destination, When the activity is guessed, Then it returns an empty string rather than throwing', () => {
    expect(guessActivityFromDestination('')).toBe('');
  });

  it('Given a destination in mixed case, When the activity is guessed, Then matching is case-insensitive', () => {
    expect(guessActivityFromDestination('WHISTLER')).toBe('ski');
  });
});

describe('resolveActivity', () => {
  it('Given an explicit activity, When resolved, Then the explicit value wins over any guess', () => {
    expect(resolveActivity('formal', 'Whistler')).toBe('formal');
  });

  it('Given an explicit empty string (deliberately Casual), When resolved, Then it stays empty rather than falling back to a guess', () => {
    expect(resolveActivity('', 'Whistler')).toBe('');
  });

  it('Given no explicit activity (null), When resolved, Then it falls back to the destination guess', () => {
    expect(resolveActivity(null, 'Whistler')).toBe('ski');
  });

  it('Given no explicit activity and no guessable destination, When resolved, Then it returns an empty string', () => {
    expect(resolveActivity(null, 'Springfield')).toBe('');
  });
});

describe('resolveDayActivity', () => {
  it('Given a day tagged with its own leg-2 destinationName (Whistler) that differs from the trip\'s primary destination (Maui, a beach guess), When no explicit activity is set, Then the guess comes from the day\'s own destinationName, not the primary destination', () => {
    // This is the exact bug: Maui alone would guess "beach", but this day
    // belongs to the Whistler leg and must guess "ski" instead.
    expect(resolveDayActivity(null, 'Whistler', 'Maui')).toBe('ski');
    expect(resolveDayActivity(null, 'Whistler', 'Maui')).not.toBe(guessActivityFromDestination('Maui'));
  });

  it('Given a day with no destinationName (single-destination trip, or before any leg split exists), When no explicit activity is set, Then it falls back to guessing from the primary destination', () => {
    expect(resolveDayActivity(null, undefined, 'Whistler')).toBe('ski');
    expect(resolveDayActivity(null, null, 'Whistler')).toBe('ski');
  });

  it('Given a destinationName that is only whitespace, When no explicit activity is set, Then it is treated as absent and falls back to the primary destination', () => {
    expect(resolveDayActivity(null, '   ', 'Whistler')).toBe('ski');
  });

  it('Given an explicit activity, When resolved, Then the explicit value wins regardless of destinationName', () => {
    expect(resolveDayActivity('formal', 'Whistler', 'Maui')).toBe('formal');
  });

  it('Given an explicit empty string (deliberately Casual), When resolved, Then it stays empty rather than falling back to any guess', () => {
    expect(resolveDayActivity('', 'Whistler', 'Maui')).toBe('');
  });
});

describe('ACTIVITY_OPTIONS', () => {
  it('Given the option list, When values are collected, Then each activity value is unique', () => {
    const values = ACTIVITY_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('Given the option list, When inspected, Then it includes the Casual fallback option', () => {
    expect(ACTIVITY_OPTIONS.some((o) => o.value === '')).toBe(true);
  });
});
