import { describe, it, expect } from 'vitest';
import { tripDurationFromDates } from '../src/utils/tripDuration';

describe('tripDurationFromDates', () => {
  it('Given a start and end date on the same day, When duration is computed, Then it is a single day, not zero', () => {
    expect(tripDurationFromDates('2026-08-01', '2026-08-01')).toBe(1);
  });

  it('Given a start and end date five days apart, When duration is computed, Then it is inclusive of both endpoints', () => {
    // Aug 1 - Aug 5 is 5 travel days (1,2,3,4,5), not a 4-day difference.
    expect(tripDurationFromDates('2026-08-01', '2026-08-05')).toBe(5);
  });

  it('Given an end date before the start date, When duration is computed, Then zero is returned rather than a negative number', () => {
    expect(tripDurationFromDates('2026-08-05', '2026-08-01')).toBe(0);
  });

  it('Given an unparseable date string, When duration is computed, Then zero is returned rather than NaN', () => {
    expect(tripDurationFromDates('not-a-date', '2026-08-05')).toBe(0);
    expect(tripDurationFromDates('2026-08-01', 'not-a-date')).toBe(0);
  });

  it('Given empty date strings, When duration is computed, Then zero is returned rather than throwing', () => {
    expect(tripDurationFromDates('', '')).toBe(0);
  });
});
