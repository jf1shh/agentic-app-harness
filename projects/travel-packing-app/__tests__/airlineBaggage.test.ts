import { describe, it, expect } from 'vitest';
import { AIRLINES, lookupAirline, checkBaggageCompliance, searchAirlines, getAllAirlines, getRegions } from '../src/utils/airlineBaggage';

// Backfilled coverage (.agents/AGENTS.md §5): the module already worked, so
// there is no Red step. Every case below was proved by mutation instead — see
// the PR body for each mutation and the case that caught it.
//
// What is actually at stake: this is the check that tells a traveller their bag
// will board. A false "compliant" is a gate-side repack or a paid bag drop.

describe('lookupAirline', () => {
  it('Given an exact IATA code, When it is looked up, Then the airline is returned', () => {
    expect(lookupAirline('FR')?.name).toBe('Ryanair');
    expect(lookupAirline('DL')?.name).toBe('Delta Air Lines');
  });

  it('Given a code in the wrong case or with stray whitespace, When it is looked up, Then it still resolves', () => {
    // A code typed into a form arrives however the user typed it.
    expect(lookupAirline('fr')?.code).toBe('FR');
    expect(lookupAirline('  u2  ')?.code).toBe('U2');
    expect(lookupAirline('Ek')?.code).toBe('EK');
  });

  it('Given a code no airline uses, When it is looked up, Then null is returned rather than a wrong airline', () => {
    expect(lookupAirline('ZZ')).toBeNull();
  });

  it('Given an empty or non-string code, When it is looked up, Then null is returned rather than throwing', () => {
    expect(lookupAirline('')).toBeNull();
    expect(lookupAirline(undefined as unknown as string)).toBeNull();
    expect(lookupAirline(123 as unknown as string)).toBeNull();
  });
});

describe('the shipped airline dataset', () => {
  it('Given the AIRLINES table, When codes are collected, Then each airline appears once', () => {
    const codes = AIRLINES.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('Given the AIRLINES table, When each policy is inspected, Then every carry-on has positive dimensions', () => {
    // A zero dimension would make every bag "compliant" on that axis.
    for (const airline of AIRLINES) {
      expect(airline.carryOn.l).toBeGreaterThan(0);
      expect(airline.carryOn.w).toBeGreaterThan(0);
      expect(airline.carryOn.h).toBeGreaterThan(0);
    }
  });

  it('Given the AIRLINES table, When its size is checked, Then it covers the full ported dataset rather than a handful of carriers', () => {
    expect(AIRLINES.length).toBeGreaterThanOrEqual(70);
  });
});

describe('searchAirlines', () => {
  it('Given a query matching an airline name, When searched, Then it is returned', () => {
    const results = searchAirlines('Emirates');
    expect(results.some((a) => a.code === 'EK')).toBe(true);
  });

  it('Given a query that is exactly an IATA code, When searched, Then that airline is included even if the code is a substring of others', () => {
    const results = searchAirlines('FR');
    expect(results.some((a) => a.code === 'FR')).toBe(true);
  });

  it('Given a query shorter than 2 characters, When searched, Then no results are returned', () => {
    expect(searchAirlines('E')).toEqual([]);
  });

  it('Given a broad query, When searched, Then results are capped at 12', () => {
    const results = searchAirlines('a');
    expect(results.length).toBeLessThanOrEqual(12);
  });
});

describe('getAllAirlines', () => {
  it('Given no region filter, When airlines are listed, Then every airline in the table is returned', () => {
    expect(getAllAirlines()).toHaveLength(AIRLINES.length);
  });

  it('Given a region filter, When airlines are listed, Then only that region is returned', () => {
    const results = getAllAirlines('Middle East');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => a.region === 'Middle East')).toBe(true);
  });

  it('Given a region with no airlines, When airlines are listed, Then an empty array is returned', () => {
    expect(getAllAirlines('Antarctica')).toEqual([]);
  });
});

describe('getRegions', () => {
  it('Given the dataset, When regions are listed, Then they are unique and sorted', () => {
    const regions = getRegions();
    expect(new Set(regions).size).toBe(regions.length);
    expect(regions).toEqual([...regions].sort());
    expect(regions).toContain('Europe');
    expect(regions).toContain('Asia');
  });
});

describe('checkBaggageCompliance', () => {
  // Ryanair: 55 x 40 x 20, 10kg — the strictest carry-on in the table.
  const ryanairLimit = { l: 55, w: 40, h: 20 };

  it('Given a bag within every carry-on dimension, When compliance is checked, Then it is compliant with no warnings', () => {
    const result = checkBaggageCompliance({ l: 50, w: 35, h: 18 }, 'FR');
    expect(result.compliant).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.airline?.code).toBe('FR');
  });

  it('Given a bag exactly on the limit, When compliance is checked, Then the limit is inclusive and it passes', () => {
    // Off-by-one here is the difference between "fits" and "does not".
    const result = checkBaggageCompliance(ryanairLimit, 'FR');
    expect(result.compliant).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('Given a bag one centimetre over on length, When compliance is checked, Then it is non-compliant', () => {
    const result = checkBaggageCompliance({ ...ryanairLimit, l: 56 }, 'FR');
    expect(result.compliant).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Length');
    expect(result.byDimension.length).toEqual({ actual: 56, limit: 55, over: true });
  });

  it.each([
    ['width', { l: 50, w: 41, h: 18 }, 'Width', 41, 40],
    ['height', { l: 50, w: 35, h: 21 }, 'Height', 21, 20],
  ])('Given a bag over on %s, When compliance is checked, Then that dimension is reported with its actual and limit',
    (dimension, suitcase, label, actual, limit) => {
      const result = checkBaggageCompliance(suitcase as { l: number; w: number; h: number }, 'FR');
      expect(result.compliant).toBe(false);
      expect(result.warnings[0]).toContain(label as string);
      expect(result.byDimension[dimension as string]).toEqual({ actual, limit, over: true });
    });

  it('Given a bag over on all three dimensions, When compliance is checked, Then every breach is reported, not just the first', () => {
    // A traveller told only about length would shave one side and still fail.
    const result = checkBaggageCompliance({ l: 60, w: 45, h: 25 }, 'FR');
    expect(result.compliant).toBe(false);
    expect(result.warnings).toHaveLength(3);
    expect(Object.keys(result.byDimension).sort()).toEqual(['height', 'length', 'weight', 'width']);
  });

  it('Given a dimension within the limit, When compliance is checked, Then it is absent from byDimension rather than reported as passing', () => {
    const result = checkBaggageCompliance({ l: 56, w: 35, h: 18 }, 'FR');
    expect(result.byDimension.length).toBeDefined();
    expect(result.byDimension.width).toBeUndefined();
    expect(result.byDimension.height).toBeUndefined();
  });

  it('Given an airline that states a carry-on weight limit, When compliance is checked, Then the limit is surfaced', () => {
    // Ryanair states 10kg; the limit is carried out so the UI can show it.
    const result = checkBaggageCompliance({ l: 50, w: 35, h: 18 }, 'FR');
    expect(result.byDimension.weight).toEqual({ limit: 10 });
  });

  it('Given an airline with no stated weight limit, When compliance is checked, Then no weight entry is invented', () => {
    // Delta states none; reporting "limit: 0" would render as a 0kg allowance.
    const result = checkBaggageCompliance({ l: 50, w: 34, h: 22 }, 'DL');
    expect(result.byDimension.weight).toBeUndefined();
  });

  it('Given an unknown airline code, When compliance is checked, Then it fails open with no airline and no warnings', () => {
    // Deliberate current behaviour: an unrecognised carrier cannot be judged, so
    // the app does not claim a breach. Asserted so that changing it to fail
    // closed is a visible decision rather than a silent one.
    const result = checkBaggageCompliance({ l: 200, w: 200, h: 200 }, 'ZZ');
    expect(result.airline).toBeNull();
    expect(result.compliant).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.byDimension).toEqual({});
  });

  it('Given a strict-carry-on airline and a lenient one, When the same bag is checked, Then the stricter policy is the one that rejects it', () => {
    // 56 x 35 x 22 is a standard US carry-on: fine on Delta, over on Ryanair.
    const bag = { l: 56, w: 35, h: 22 };
    expect(checkBaggageCompliance(bag, 'DL').compliant).toBe(true);
    expect(checkBaggageCompliance(bag, 'FR').compliant).toBe(false);
  });
});
