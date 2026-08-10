import { describe, it, expect } from 'vitest';
import { splitTripDays, buildDestinationLegs, buildDayDestinations } from '../src/utils/multiDestination';

describe('splitTripDays', () => {
  it('Given 7 days across 3 legs, When split, Then the remainder is given to the earliest legs so counts differ by at most one', () => {
    expect(splitTripDays(7, 3)).toEqual([3, 2, 2]);
  });

  it('Given a day count that divides evenly, When split, Then every leg gets an equal share', () => {
    expect(splitTripDays(6, 3)).toEqual([2, 2, 2]);
  });

  it('Given fewer days than legs, When split, Then the earliest legs get one day each and the rest get zero', () => {
    expect(splitTripDays(2, 3)).toEqual([1, 1, 0]);
  });

  it('Given zero total days, When split, Then every leg gets zero days rather than a negative or NaN count', () => {
    expect(splitTripDays(0, 3)).toEqual([0, 0, 0]);
  });

  it('Given zero legs, When split, Then an empty array is returned rather than dividing by zero', () => {
    expect(splitTripDays(5, 0)).toEqual([]);
  });
});

describe('buildDestinationLegs', () => {
  it('Given three destinations and a 7-day trip starting 2026-08-01, When legs are built, Then each leg gets a contiguous, non-overlapping date range sized by its day share', () => {
    const legs = buildDestinationLegs(['Tokyo', 'Kyoto', 'Osaka'], 7, '2026-08-01');
    expect(legs).toEqual([
      { destination: 'Tokyo', days: 3, startDate: '2026-08-01', endDate: '2026-08-03' },
      { destination: 'Kyoto', days: 2, startDate: '2026-08-04', endDate: '2026-08-05' },
      { destination: 'Osaka', days: 2, startDate: '2026-08-06', endDate: '2026-08-07' },
    ]);
  });

  it('Given blank destination entries mixed in, When legs are built, Then they are dropped before the day split so they consume no days', () => {
    const legs = buildDestinationLegs(['Tokyo', '  ', 'Osaka'], 4, '2026-08-01');
    expect(legs.map((l) => l.destination)).toEqual(['Tokyo', 'Osaka']);
  });

  it('Given fewer trip days than destinations, When legs are built, Then legs assigned zero days are excluded rather than emitted with an empty range', () => {
    const legs = buildDestinationLegs(['Tokyo', 'Kyoto', 'Osaka'], 2, '2026-08-01');
    expect(legs).toEqual([
      { destination: 'Tokyo', days: 1, startDate: '2026-08-01', endDate: '2026-08-01' },
      { destination: 'Kyoto', days: 1, startDate: '2026-08-02', endDate: '2026-08-02' },
    ]);
  });

  it('Given no destinations, When legs are built, Then an empty array is returned', () => {
    expect(buildDestinationLegs([], 5, '2026-08-01')).toEqual([]);
  });
});

describe('buildDayDestinations', () => {
  it('Given a 7-day trip across three destinations, When each day is mapped, Then day indexes fall in their own leg\'s destination -- never the previous leg\'s -- using the same 3/2/2 split as buildDestinationLegs', () => {
    expect(buildDayDestinations(['Tokyo', 'Kyoto', 'Osaka'], 7)).toEqual([
      'Tokyo', 'Tokyo', 'Tokyo',
      'Kyoto', 'Kyoto',
      'Osaka', 'Osaka',
    ]);
  });

  it('Given a single destination, When each day is mapped, Then every day maps to that one destination', () => {
    expect(buildDayDestinations(['Hawaii'], 4)).toEqual(['Hawaii', 'Hawaii', 'Hawaii', 'Hawaii']);
  });

  it('Given blank destination entries mixed in, When each day is mapped, Then they are dropped before the split so they never own a day', () => {
    expect(buildDayDestinations(['Tokyo', '  ', 'Osaka'], 4)).toEqual(['Tokyo', 'Tokyo', 'Osaka', 'Osaka']);
  });

  it('Given no destinations, When each day is mapped, Then an empty array is returned rather than throwing', () => {
    expect(buildDayDestinations([], 5)).toEqual([]);
  });

  it('Given fewer trip days than destinations, When each day is mapped, Then legs assigned zero days own no day rather than an empty-string placeholder', () => {
    expect(buildDayDestinations(['Tokyo', 'Kyoto', 'Osaka'], 2)).toEqual(['Tokyo', 'Kyoto']);
  });
});
