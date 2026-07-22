import { describe, it, expect } from 'vitest';
import { calculateAggregateScore } from '../aggregateScoring';

describe('calculateAggregateScore', () => {
  it('calculates weighted composite score for Google and Yelp reviews', () => {
    const google = { rating: 4.8, reviewCount: 1500 };
    const yelp = { rating: 4.6, reviewCount: 800 };

    const result = calculateAggregateScore(google, yelp);

    expect(result.compositeScore).toBeGreaterThanOrEqual(4.6);
    expect(result.compositeScore).toBeLessThanOrEqual(4.8);
    expect(result.sentimentSummary).toContain('acclaimed');
  });

  it('calculates multi-source aggregate with TripAdvisor, OpenTable, and Infatuation scores', () => {
    const google = { rating: 4.8, reviewCount: 3200 };
    const yelp = { rating: 4.7, reviewCount: 5500 };
    const tripAdvisor = { rating: 4.8, reviewCount: 4100 };
    const openTable = { rating: 4.9, reviewCount: 8900 };
    const infatuation = 9.3;

    const result = calculateAggregateScore(google, yelp, tripAdvisor, undefined, infatuation, openTable);

    expect(result.compositeScore).toBeGreaterThanOrEqual(4.7);
    expect(result.tripAdvisor?.rating).toBe(4.8);
    expect(result.openTable?.rating).toBe(4.9);
    expect(result.infatuationScore).toBe(9.3);
  });

  it('applies Michelin Star bonus to composite rating', () => {
    const google = { rating: 4.8, reviewCount: 3500 };
    const yelp = { rating: 4.6, reviewCount: 2800 };
    const michelin = { stars: 3 as const, description: '3 Michelin Stars' };

    const result = calculateAggregateScore(google, yelp, undefined, michelin);

    expect(result.compositeScore).toBe(5.0);
    expect(result.sentimentSummary).toContain('3 Michelin Star');
  });
});
