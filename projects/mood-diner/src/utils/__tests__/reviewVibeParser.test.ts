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
});
