import { describe, it, expect } from 'vitest';
import { guessActivityFromDestination, resolveActivity, ACTIVITY_OPTIONS } from '../src/utils/activity';

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

describe('ACTIVITY_OPTIONS', () => {
  it('Given the option list, When values are collected, Then each activity value is unique', () => {
    const values = ACTIVITY_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it('Given the option list, When inspected, Then it includes the Casual fallback option', () => {
    expect(ACTIVITY_OPTIONS.some((o) => o.value === '')).toBe(true);
  });
});
