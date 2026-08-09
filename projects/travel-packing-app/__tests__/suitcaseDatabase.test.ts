import { describe, it, expect } from 'vitest';
import { MODELS, lookupByBarcode, searchByBrand, getAllBrands, getModelsForBrand } from '../src/utils/suitcaseDatabase';

// Backfilled coverage (.agents/AGENTS.md §5): this module had no test file at
// all before this PR, for any of its functions old or new. No Red step —
// every case here was proved by mutation instead; see the PR body.

describe('the shipped suitcase dataset', () => {
  it('Given the MODELS table, When brand+model pairs are collected, Then each pair appears once', () => {
    const keys = MODELS.map((m) => `${m.brand}|${m.model}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('Given the MODELS table, When each entry is inspected, Then every dimension is positive', () => {
    for (const m of MODELS) {
      expect(m.l).toBeGreaterThan(0);
      expect(m.w).toBeGreaterThan(0);
      expect(m.h).toBeGreaterThan(0);
    }
  });
});

describe('lookupByBarcode', () => {
  it('Given a barcode that exactly matches a known UPC prefix, When it is looked up, Then the matching model is returned', () => {
    const result = lookupByBarcode('81875802');
    expect(result?.brand).toBe('Away');
    expect(result?.model).toBe('The Carry-On');
  });

  it('Given a barcode that starts with a known prefix but has extra digits, When it is looked up, Then it still matches', () => {
    const result = lookupByBarcode('818758021234');
    expect(result?.brand).toBe('Away');
  });

  it('Given a barcode with stray whitespace or hyphens, When it is looked up, Then the formatting is ignored', () => {
    const result = lookupByBarcode('8187-5802');
    expect(result?.brand).toBe('Away');
  });

  it('Given a barcode too short to be a real UPC, When it is looked up, Then null is returned rather than a false match', () => {
    expect(lookupByBarcode('1234567')).toBeNull();
  });

  it('Given a barcode matching no known prefix, When it is looked up, Then null is returned', () => {
    expect(lookupByBarcode('99999999')).toBeNull();
  });

  it('Given an empty barcode, When it is looked up, Then null is returned rather than throwing', () => {
    expect(lookupByBarcode('')).toBeNull();
  });
});

describe('getModelsForBrand', () => {
  it('Given a brand with multiple models, When looked up, Then every model for that brand is returned', () => {
    const results = getModelsForBrand('Away');
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.every((m) => m.brand === 'Away')).toBe(true);
  });

  it('Given a brand name in the wrong case, When looked up, Then it still matches', () => {
    expect(getModelsForBrand('away').length).toBeGreaterThan(0);
  });

  it('Given an empty brand, When looked up, Then an empty array is returned rather than every model', () => {
    expect(getModelsForBrand('')).toEqual([]);
  });

  it('Given a brand with no models, When looked up, Then an empty array is returned', () => {
    expect(getModelsForBrand('Nonexistent Brand')).toEqual([]);
  });
});

describe('searchByBrand', () => {
  it('Given a query matching several brands, When searched, Then matching models are returned, capped at 12', () => {
    const results = searchByBrand('carry-on');
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(12);
  });

  it('Given a query shorter than 2 characters, When searched, Then no results are returned', () => {
    expect(searchByBrand('a')).toEqual([]);
    expect(searchByBrand('')).toEqual([]);
  });

  it('Given duplicate brand+model matches, When searched, Then each pair appears only once', () => {
    const results = searchByBrand('Rimowa');
    const keys = results.map((r) => `${r.brand}|${r.model}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('getAllBrands', () => {
  it('Given the dataset, When brands are listed, Then they are unique and sorted', () => {
    const brands = getAllBrands();
    expect(new Set(brands).size).toBe(brands.length);
    expect(brands).toEqual([...brands].sort());
  });
});
