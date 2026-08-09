import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSlug, fetchTravelAdvisory, extractPackingRelevance } from '../src/services/advisory';

describe('getSlug', () => {
  it('Given a known ISO country code, When the slug is looked up, Then it returns the GOV.UK hyphenated slug', () => {
    expect(getSlug('FR')).toBe('france');
    expect(getSlug('US')).toBe('usa');
  });

  it('Given a country code in lowercase, When looked up, Then it still resolves', () => {
    expect(getSlug('fr')).toBe('france');
  });

  it('Given an unknown country code, When looked up, Then null is returned rather than a wrong slug', () => {
    expect(getSlug('ZZ')).toBeNull();
  });

  it('Given no country code, When looked up, Then null is returned rather than throwing', () => {
    expect(getSlug('')).toBeNull();
  });
});

describe('fetchTravelAdvisory', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Given a country with no known slug, When advisory is fetched, Then null is returned without making a request', async () => {
    const result = await fetchTravelAdvisory('ZZ');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Given a successful response with a summary part, When advisory is fetched, Then title/summary/url are extracted', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Foreign travel advice: Thailand',
        public_updated_at: '2026-07-01T00:00:00Z',
        details: {
          parts: [{ slug: 'summary', title: 'Summary', body: '<p>Be aware of monsoon season.</p>' }],
        },
      }),
    });
    const result = await fetchTravelAdvisory('TH');
    expect(result?.title).toBe('Foreign travel advice: Thailand');
    expect(result?.summary).toContain('Be aware of monsoon season.');
    expect(result?.url).toBe('https://www.gov.uk/foreign-travel-advice/thailand');
  });

  it('Given the API responds with a non-ok status, When advisory is fetched, Then null is returned rather than throwing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });
    const result = await fetchTravelAdvisory('FR');
    expect(result).toBeNull();
  });

  it('Given the fetch itself rejects, When advisory is fetched, Then null is returned rather than throwing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));
    const result = await fetchTravelAdvisory('FR');
    expect(result).toBeNull();
  });

  it('Given a response with no extractable summary, When advisory is fetched, Then a generic fallback summary is used', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Foreign travel advice: Nowhere', details: {} }),
    });
    const result = await fetchTravelAdvisory('FR');
    expect(result?.summary).toContain('Check the GOV.UK website');
  });
});

describe('extractPackingRelevance', () => {
  it('Given an advisory with safety/health/local-laws parts, When packing relevance is extracted, Then each section is pulled out', () => {
    const advisory = {
      raw: {
        details: {
          parts: [
            { slug: 'safety-and-security', title: 'Safety and security', body: '<p>Avoid protests.</p>' },
            { slug: 'health', title: 'Health', body: '<p>Carry mosquito repellent.</p>' },
            { slug: 'local-laws-and-customs', title: 'Local laws', body: '<p>No public alcohol.</p>' },
          ],
        },
      },
    };
    const relevance = extractPackingRelevance(advisory);
    expect(relevance.safety).toContain('Avoid protests.');
    expect(relevance.health).toContain('Carry mosquito repellent.');
    expect(relevance.localLaws).toContain('No public alcohol.');
  });

  it('Given an advisory with no raw details, When packing relevance is extracted, Then empty strings are returned rather than throwing', () => {
    expect(extractPackingRelevance(null)).toEqual({ safety: '', health: '', localLaws: '' });
    expect(extractPackingRelevance({})).toEqual({ safety: '', health: '', localLaws: '' });
  });

  it('Given a part whose slug does not contain the keyword but whose title does, When extracted, Then it still matches by title', () => {
    const advisory = {
      raw: {
        details: {
          parts: [{ slug: 'section-2', title: 'Health advice', body: '<p>Yellow fever vaccination recommended.</p>' }],
        },
      },
    };
    expect(extractPackingRelevance(advisory).health).toContain('Yellow fever vaccination recommended.');
  });
});
