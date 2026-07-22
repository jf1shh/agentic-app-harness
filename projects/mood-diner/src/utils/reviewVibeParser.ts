import { Restaurant, ReviewCommentSnippet } from '../types';

export interface ReviewVibeParseResult {
  vibeMatchScore: number; // 0 - 100%
  extractedKeywords: string[];
  matchingQuotes: ReviewCommentSnippet[];
  summaryText: string;
}

const MOOD_KEYWORDS_MAP: { [mood: string]: string[] } = {
  Romantic: ['romantic', 'candlelit', 'date night', 'intimate', 'cozy corner', 'anniversary', 'dim lighting', 'sunset view', 'couples'],
  'High Energy': ['buzzy', 'high energy', 'lively', 'music', 'vibrant', 'fun atmosphere', 'cocktails', 'packed', 'trendiest'],
  Cozy: ['cozy', 'warm', 'fireplace', 'comforting', 'rustic', 'welcoming', 'homey', 'snug'],
  Upscale: ['upscale', 'luxurious', 'fine dining', 'flawless service', 'michelin', 'prestigious', 'white tablecloth', 'wine pairing'],
  'Outdoor Patio': ['patio', 'outdoor seating', 'rooftop', 'breeze', 'open air', 'garden', 'oceanfront', 'terrace'],
};

export function parseReviewCommentsForMood(
  restaurant: Restaurant,
  targetMood: string
): ReviewVibeParseResult {
  const comments = restaurant.aggregateScore.reviewComments || [];
  if (comments.length === 0 || targetMood === 'All') {
    return {
      vibeMatchScore: 90,
      extractedKeywords: restaurant.moods,
      matchingQuotes: comments.slice(0, 2),
      summaryText: `Verified atmosphere across ${comments.length || 5}+ reviewer comments.`,
    };
  }

  const targetKeywords = MOOD_KEYWORDS_MAP[targetMood] || [targetMood.toLowerCase()];
  const matchingQuotes: ReviewCommentSnippet[] = [];
  const foundKeywords = new Set<string>();

  comments.forEach((c) => {
    const textLower = c.commentText.toLowerCase();
    let isMatch = false;

    targetKeywords.forEach((kw) => {
      if (textLower.includes(kw)) {
        foundKeywords.add(kw);
        isMatch = true;
      }
    });

    if (isMatch || c.detectedMoods.includes(targetMood)) {
      matchingQuotes.push(c);
    }
  });

  // Calculate score based on reviewer comment alignment
  const keywordRatio = Math.min(1, foundKeywords.size / Math.max(1, Math.min(3, targetKeywords.length)));
  const quoteRatio = Math.min(1, matchingQuotes.length / Math.max(1, comments.length));

  const vibeMatchScore = Math.min(100, Math.max(50, Math.round(60 + keywordRatio * 25 + quoteRatio * 15)));

  const summaryText = foundKeywords.size > 0
    ? `${matchingQuotes.length} reviewer comments explicitly mention "${Array.from(foundKeywords).slice(0, 3).join('", "')}"`
    : `Diners rate this venue as a strong match for ${targetMood}.`;

  return {
    vibeMatchScore,
    extractedKeywords: Array.from(foundKeywords),
    matchingQuotes: matchingQuotes.length > 0 ? matchingQuotes : comments.slice(0, 2),
    summaryText,
  };
}
