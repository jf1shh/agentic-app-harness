// Per-day activity tagging: guesses a default activity from the trip's
// destination text, and lets a user override it per day. The wardrobe
// engine already branches on DayItinerary.activity (evening-outfit
// selection, hot-weather color filter), this module just supplies the
// per-day value instead of one blanket default for the whole trip.

export interface ActivityOption {
  value: string;
  label: string;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { value: '', label: '🚶 Casual' },
  { value: 'sightseeing', label: '📸 Sightseeing' },
  { value: 'formal', label: '🍷 Formal' },
  { value: 'business', label: '👔 Business' },
  { value: 'beach', label: '🏖️ Beach' },
  { value: 'hike', label: '🥾 Hike' },
  { value: 'ski', label: '⛷️ Ski' },
  { value: 'nightout', label: '🕺 Night Out' },
  { value: 'gym', label: '💪 Gym' },
  { value: 'transit', label: '✈️ Transit' },
];

export function guessActivityFromDestination(dest: string): string {
  if (!dest) return '';
  const d = dest.toLowerCase();
  if (/(ski|aspen|whistler|chamonix|vail|tahoe|niseko|snow|breckenridge|banff|park city|alps)/.test(d)) return 'ski';
  if (/(beach|honolulu|maui|cancun|maldives|ibiza|bali|phuket|miami|tulum|boracay|fiji|resort)/.test(d)) return 'beach';
  if (/(hike|yosemite|zion|glacier|yellowstone|patagonia|machu picchu|kilimanjaro|trail|camp)/.test(d)) return 'hike';
  if (/(vegas|mykonos|new orleans|night|club)/.test(d)) return 'nightout';
  if (/(business|corporate|hq|office|meeting|conference)/.test(d)) return 'business';
  if (/(london|paris|rome|tokyo|new york|nyc|berlin|madrid|barcelona|amsterdam|prague|vienna|sightseeing)/.test(d)) return 'sightseeing';
  return '';
}

/**
 * Resolve the activity actually used for a day: an explicit choice (including
 * a deliberately empty string for "Casual") always wins; `null`/`undefined`
 * means "not yet chosen", which falls back to guessing from the destination.
 */
export function resolveActivity(explicit: string | null | undefined, destination: string): string {
  if (explicit !== null && explicit !== undefined) return explicit;
  return guessActivityFromDestination(destination);
}
