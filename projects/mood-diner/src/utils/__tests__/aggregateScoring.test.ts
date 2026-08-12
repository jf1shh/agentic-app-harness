import { describe, it, expect } from 'vitest';
import { calculateAggregateScore } from '../aggregateScoring';

describe('calculateAggregateScore', () => {
  it('Given Google and Yelp ratings, When the aggregate is calculated, Then the composite sits between the two source ratings and reads as acclaimed', () => {
    const google = { rating: 4.8, reviewCount: 1500 };
    const yelp = { rating: 4.6, reviewCount: 800 };

    const result = calculateAggregateScore(google, yelp);

    expect(result.compositeScore).toBeGreaterThanOrEqual(4.6);
    expect(result.compositeScore).toBeLessThanOrEqual(4.8);
    expect(result.sentimentSummary).toContain('acclaimed');
  });

  it('Given ratings from five review sources, When the aggregate is calculated, Then every source is carried through onto the result', () => {
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

  it('Given a three-star Michelin restaurant, When the aggregate is calculated, Then the star bonus lifts the composite to 5.0 and the summary names the stars', () => {
    const google = { rating: 4.8, reviewCount: 3500 };
    const yelp = { rating: 4.6, reviewCount: 2800 };
    const michelin = { stars: 3 as const, description: '3 Michelin Stars' };

    const result = calculateAggregateScore(google, yelp, undefined, michelin);

    expect(result.compositeScore).toBe(5.0);
    expect(result.sentimentSummary).toContain('3 Michelin Star');
  });

  // Mutation testing (node scripts/run-mutation.mjs mood-diner --mutate
  // "src/utils/aggregateScoring.ts") found the 2-star and 1-star Michelin
  // bonus tiers, the Bib Gourmand tier, and two of the four sentiment-summary
  // tiers entirely NoCoverage -- only the 3-star tier had ever been tried.

  it.each([2 as const, 1 as const])(
    'Given a %i-star Michelin restaurant, When the aggregate is calculated, Then the star bonus measurably raises the composite over the same ratings with no Michelin recognition',
    (stars) => {
      // Not asserting the exact bonus magnitude: with a 1-decimal rounding
      // step on the final score, a 0.15 bonus can land exactly on a rounding
      // boundary depending on the base rating, making "diff equals 0.15"
      // fragile for reasons unrelated to whether the bonus tier fired at
      // all. Asserting it's strictly greater still kills a mutant that
      // disables or misconditions this tier.
      const google = { rating: 4.0, reviewCount: 1000 };
      const yelp = { rating: 4.0, reviewCount: 1000 };
      const withoutMichelin = calculateAggregateScore(google, yelp);
      const withMichelin = calculateAggregateScore(google, yelp, undefined, { stars });
      expect(withMichelin.compositeScore).toBeGreaterThan(withoutMichelin.compositeScore);
    },
  );

  it('Given a Bib Gourmand restaurant with no star rating, When the aggregate is calculated, Then a smaller 0.10 bonus applies and the summary names Bib Gourmand', () => {
    const google = { rating: 4.0, reviewCount: 1000 };
    const yelp = { rating: 4.0, reviewCount: 1000 };
    const withoutMichelin = calculateAggregateScore(google, yelp);
    const withBibGourmand = calculateAggregateScore(google, yelp, undefined, { bibGourmand: true });
    expect(withBibGourmand.compositeScore - withoutMichelin.compositeScore).toBeCloseTo(0.1, 1);
    expect(withBibGourmand.sentimentSummary).toContain('Bib Gourmand');
  });

  it('Given a composite score in the 4.4-4.69 band with no Michelin recognition, When the aggregate is calculated, Then the summary reads as "highly recommended" rather than "universally acclaimed"', () => {
    const google = { rating: 4.5, reviewCount: 1000 };
    const yelp = { rating: 4.5, reviewCount: 1000 };
    const result = calculateAggregateScore(google, yelp);
    expect(result.compositeScore).toBeGreaterThanOrEqual(4.4);
    expect(result.compositeScore).toBeLessThan(4.7);
    expect(result.sentimentSummary).toContain('Highly recommended');
  });

  it('Given a composite score below 4.4 with no Michelin recognition, When the aggregate is calculated, Then the summary reads as solid customer praise rather than an acclaim tier', () => {
    const google = { rating: 3.8, reviewCount: 1000 };
    const yelp = { rating: 3.8, reviewCount: 1000 };
    const result = calculateAggregateScore(google, yelp);
    expect(result.compositeScore).toBeLessThan(4.4);
    expect(result.sentimentSummary).toContain('Solid customer praise');
  });
});
