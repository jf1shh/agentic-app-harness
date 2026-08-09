import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  COUNTRY_CURRENCY,
  TYPICAL_COSTS_USD,
  fetchExchangeRates,
  getCurrencyForCountry,
  formatCurrency,
  convertCost,
} from '../src/services/currency';

describe('getCurrencyForCountry', () => {
  it('Given a known ISO country code, When the currency is looked up, Then it returns the mapped currency', () => {
    expect(getCurrencyForCountry('JP')).toBe('JPY');
    expect(getCurrencyForCountry('FR')).toBe('EUR');
  });

  it('Given a country code in lowercase, When looked up, Then it still resolves', () => {
    expect(getCurrencyForCountry('jp')).toBe('JPY');
  });

  it('Given an unknown country code, When looked up, Then null is returned rather than a wrong currency', () => {
    expect(getCurrencyForCountry('XX')).toBeNull();
  });

  it('Given no country code, When looked up, Then null is returned rather than throwing', () => {
    expect(getCurrencyForCountry('')).toBeNull();
    expect(getCurrencyForCountry(undefined as unknown as string)).toBeNull();
  });
});

describe('formatCurrency', () => {
  it('Given an amount and a valid currency code, When formatted, Then it renders as localized currency', () => {
    expect(formatCurrency(18, 'USD')).toBe('$18.00');
  });

  it('Given an invalid currency code, When formatted, Then it falls back to a plain "CODE amount" string rather than throwing', () => {
    expect(formatCurrency(18, 'NOTACODE')).toBe('NOTACODE 18.00');
  });
});

describe('convertCost', () => {
  it('Given a known cost key and an exchange rate, When converted, Then it returns the USD baseline and the converted amount', () => {
    const result = convertCost('coffee', 150, 'JPY');
    // TYPICAL_COSTS_USD.coffee = 4
    expect(result.usd).toBe(4);
    expect(result.converted).toBe(600);
    expect(result.display).toBe(formatCurrency(4 * 150, 'JPY'));
  });

  it('Given an unknown cost key, When converted, Then it treats the USD baseline as zero rather than throwing', () => {
    const result = convertCost('not-a-real-cost', 150, 'JPY');
    expect(result.usd).toBe(0);
    expect(result.converted).toBe(0);
  });

  it('Given a rate that produces a fractional result, When converted, Then it rounds to 2 decimal places', () => {
    // TYPICAL_COSTS_USD.water = 1.5; 1.5 * 3.777 = 5.6655 -> rounds to 5.67
    const result = convertCost('water', 3.777, 'EUR');
    expect(result.converted).toBe(5.67);
  });
});

describe('fetchExchangeRates', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Given a base currency, When rates are fetched, Then it requests the Frankfurter API with that base', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2026-08-01', rates: { EUR: 0.9 } }),
    });
    const result = await fetchExchangeRates('USD', ['EUR']);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('from=USD&to=EUR'));
    expect(result.rates.EUR).toBe(0.9);
  });

  it('Given no target currencies, When rates are fetched, Then the request omits the "to" param rather than sending an empty list', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2026-08-01', rates: {} }),
    });
    await fetchExchangeRates('USD');
    expect(global.fetch).toHaveBeenCalledWith(expect.not.stringContaining('to='));
  });

  it('Given the API responds with an error status, When rates are fetched, Then it throws rather than returning a malformed result', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchExchangeRates('USD')).rejects.toThrow();
  });
});

describe('the shipped currency + cost datasets', () => {
  it('Given the COUNTRY_CURRENCY table, When inspected, Then every value is a 3-letter currency code', () => {
    for (const code of Object.values(COUNTRY_CURRENCY)) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('Given the TYPICAL_COSTS_USD table, When inspected, Then every value is a positive number', () => {
    for (const cost of Object.values(TYPICAL_COSTS_USD)) {
      expect(cost).toBeGreaterThan(0);
    }
  });
});
