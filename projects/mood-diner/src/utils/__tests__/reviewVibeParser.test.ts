import { describe, it, expect } from 'vitest';
import { parseReviewCommentsForMood } from '../reviewVibeParser';
import { Restaurant } from '../../types';

const sampleRestaurant: Restaurant = {
  id: 'r-sample',
  name: 'L’Amour Bistro',
  tagline: 'Romantic candlelit French dining',
  cuisine: 'French',
  occasions: ['Anniversary', 'First Date'],
  moods: ['Romantic', 'Intimate'],
  aggregateScore: {
    compositeScore: 4.8,
    google: { rating: 4.8, reviewCount: 500 },
    yelp: { rating: 4.7, reviewCount: 400 },
    sentimentSummary: 'Exceptional romantic vibe',
    reviewComments: [
      {
        id: 'c1',
        source: 'Google',
        author: 'Elena R.',
        rating: 5,
        date: '2 weeks ago',
        commentText: 'The candlelit tables and dim lighting made our anniversary date night so romantic!',
        detectedMoods: ['Romantic'],
      },
      {
        id: 'c2',
        source: 'OpenTable',
        author: 'Marcus T.',
        rating: 5,
        date: '1 month ago',
        commentText: 'Quiet intimate corner with white tablecloths and flawless wine pairings.',
        detectedMoods: ['Romantic', 'Upscale'],
      },
    ],
  },
  websiteUrl: 'https://lamour.com',
  verifiedWebsiteStatus: 'Verified Open',
  openingHours: { Tuesday: { openHour: 17, closeHour: 23 } },
  menu: [],
  busyHours: [],
  address: '100 Love St',
  distanceMiles: 0.5,
  walkTimeMinutes: 10,
  driveTimeMinutes: 3,
  outdoorSeating: true,
  hasFireplace: false,
  heroImage: '',
  priceRange: '$$$',
};

describe('reviewVibeParser', () => {
  it('Given reviews that mention a romantic atmosphere, When they are parsed for the Romantic mood, Then the matching keywords and quotes are extracted and scored highly', () => {
    const result = parseReviewCommentsForMood(sampleRestaurant, 'Romantic');

    expect(result.vibeMatchScore).toBeGreaterThanOrEqual(80);
    expect(result.extractedKeywords).toContain('romantic');
    expect(result.extractedKeywords).toContain('candlelit');
    expect(result.matchingQuotes.length).toBeGreaterThan(0);
    expect(result.summaryText).toContain('reviewer comments explicitly mention');
  });

  it('Given the catch-all "All" mood, When reviews are parsed, Then a neutral baseline score is returned rather than an error', () => {
    const result = parseReviewCommentsForMood(sampleRestaurant, 'All');
    expect(result.vibeMatchScore).toBe(90);
  });

  // Mutation testing (node scripts/run-mutation.mjs mood-diner --mutate
  // "src/utils/reviewVibeParser.ts") found the reviewComments-undefined
  // fallback, the unknown-mood keyword fallback, and the no-match fallback
  // paths for both matchingQuotes and summaryText all NoCoverage.

  it('Given a restaurant whose reviewComments field is undefined (not just empty), When parsed for a specific mood, Then it still returns the neutral baseline rather than throwing', () => {
    const noComments = {
      ...sampleRestaurant,
      aggregateScore: { ...sampleRestaurant.aggregateScore, reviewComments: undefined },
    };
    const result = parseReviewCommentsForMood(noComments, 'Romantic');
    expect(result.vibeMatchScore).toBe(90);
  });

  it('Given a mood that is not one of the predefined keyword sets, When parsed, Then the mood name itself is used as the only keyword', () => {
    const result = parseReviewCommentsForMood(sampleRestaurant, 'Quirky');
    // Neither review comment mentions "quirky" and neither is tagged Quirky,
    // so nothing should match -- proving the fallback keyword (not a crash
    // on an undefined lookup) is what actually ran.
    expect(result.extractedKeywords).toEqual([]);
  });

  it('Given a mood with no matching keywords or tags in any review, When parsed, Then it falls back to the first two comments and a generic summary rather than an empty result', () => {
    const result = parseReviewCommentsForMood(sampleRestaurant, 'Outdoor Patio');
    expect(result.matchingQuotes.length).toBeGreaterThan(0);
    expect(result.summaryText).toBe('Diners rate this venue as a strong match for Outdoor Patio.');
  });
});
