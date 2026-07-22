import { ReviewSource, AggregateScore, MichelinStatus } from '../types';

/**
 * Calculates a composite aggregate rating score based on Google, Yelp, TripAdvisor,
 * Michelin Guide, The Infatuation, and OpenTable Verified Diners.
 */
export function calculateAggregateScore(
  google: ReviewSource,
  yelp: ReviewSource,
  tripAdvisor?: ReviewSource,
  michelin?: MichelinStatus,
  infatuationScore?: number,
  openTable?: ReviewSource
): AggregateScore {
  let totalScoreWeight = 0;
  let weightedSum = 0;

  // 1. Google Reviews (weight logarithmic on count)
  const googleWeight = Math.log10(google.reviewCount + 10);
  weightedSum += google.rating * googleWeight;
  totalScoreWeight += googleWeight;

  // 2. Yelp Reviews
  const yelpWeight = Math.log10(yelp.reviewCount + 10);
  weightedSum += yelp.rating * yelpWeight;
  totalScoreWeight += yelpWeight;

  // 3. TripAdvisor
  if (tripAdvisor && tripAdvisor.reviewCount > 0) {
    const taWeight = Math.log10(tripAdvisor.reviewCount + 10);
    weightedSum += tripAdvisor.rating * taWeight;
    totalScoreWeight += taWeight;
  }

  // 4. OpenTable Verified Diners
  if (openTable && openTable.reviewCount > 0) {
    const otWeight = Math.log10(openTable.reviewCount + 10);
    weightedSum += openTable.rating * otWeight;
    totalScoreWeight += otWeight;
  }

  // 5. The Infatuation (0-10 scale converted to 0-5)
  if (infatuationScore && infatuationScore > 0) {
    const convertedInfatuation = infatuationScore / 2; // e.g. 9.0/10 -> 4.5/5.0
    const infatuationWeight = 3.5; // High authority review weight
    weightedSum += convertedInfatuation * infatuationWeight;
    totalScoreWeight += infatuationWeight;
  }

  // 6. Michelin Guide Boost
  let michelinBonus = 0;
  if (michelin) {
    if (michelin.stars === 3) michelinBonus = 0.25;
    else if (michelin.stars === 2) michelinBonus = 0.20;
    else if (michelin.stars === 1) michelinBonus = 0.15;
    else if (michelin.bibGourmand) michelinBonus = 0.10;
  }

  const rawComposite = (weightedSum / totalScoreWeight) + michelinBonus;
  const compositeScore = Math.min(5.0, Math.round(rawComposite * 10) / 10);

  // Sentiment summary generation
  let sentimentSummary = '';
  if (michelin?.stars) {
    sentimentSummary = `Awarded ${michelin.stars} Michelin Star${michelin.stars > 1 ? 's' : ''}! ${michelin.description || 'Pinnacle of culinary excellence across Google, Yelp, and expert food guides.'}`;
  } else if (michelin?.bibGourmand) {
    sentimentSummary = 'Michelin Bib Gourmand recipient for exceptional cuisine at great value. Highly praised by OpenTable & Google diners.';
  } else if (compositeScore >= 4.7) {
    sentimentSummary = 'Universally acclaimed across Google, Yelp, TripAdvisor, and OpenTable. Highlighted for exceptional ambiance and service.';
  } else if (compositeScore >= 4.4) {
    sentimentSummary = 'Highly recommended by diners and top food critics with stellar ratings across all platforms.';
  } else {
    sentimentSummary = 'Solid customer praise for signature dishes across major review platforms.';
  }

  return {
    compositeScore,
    google,
    yelp,
    tripAdvisor,
    michelin,
    infatuationScore,
    openTable,
    sentimentSummary,
  };
}
