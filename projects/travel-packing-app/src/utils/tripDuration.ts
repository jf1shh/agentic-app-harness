// Computes a trip's day count from its start/end date inputs, inclusive of
// both endpoints (Aug 1 - Aug 5 is 5 travel days, not a 4-day difference).
// Used to size the per-day activity picker before the itinerary is fetched.
export function tripDurationFromDates(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(0, days);
}
