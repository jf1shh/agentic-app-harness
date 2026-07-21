import { ReviewSource, AggregateScore } from '../types';

/**
 * Calculates a composite aggregate rating score based on Google and Yelp review sources.
 * We weight Google and Yelp by their review counts with logarithmic dampening to prevent
 * sheer volume from totally overpowering quality, while giving credit to higher sample sizes.
 */
export function calculateAggregateScore(google: ReviewSource, yelp: ReviewSource): AggregateScore {
  const googleWeight = Math.log10(google.reviewCount + 10);
  const yelpWeight = Math.log10(yelp.reviewCount + 10);

  const totalWeight = googleWeight + yelpWeight;
  
  const rawComposite = (google.rating * googleWeight + yelp.rating * yelpWeight) / totalWeight;
  const compositeScore = Math.round(rawComposite * 10) / 10;

  // Sentiment summary generation
  let sentimentSummary = '';
  if (compositeScore >= 4.7) {
    sentimentSummary = 'Universally acclaimed across Google and Yelp. Highlighted for exceptional ambiance and top-tier service.';
  } else if (compositeScore >= 4.4) {
    sentimentSummary = 'Highly recommended by diners with stellar ratings on both platforms.';
  } else if (compositeScore >= 4.0) {
    sentimentSummary = 'Solid customer praise for quality food, though crowd volume creates peak waiting times.';
  } else {
    sentimentSummary = 'Mixed reviews; prized for specific signature dishes.';
  }

  return {
    compositeScore,
    google,
    yelp,
    sentimentSummary,
  };
}
