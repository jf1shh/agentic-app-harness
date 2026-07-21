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

  it('handles low review counts gracefully', () => {
    const google = { rating: 5.0, reviewCount: 5 };
    const yelp = { rating: 4.0, reviewCount: 50 };

    const result = calculateAggregateScore(google, yelp);
    expect(result.compositeScore).toBeGreaterThan(4.0);
    expect(result.compositeScore).toBeLessThan(5.0);
  });
});
