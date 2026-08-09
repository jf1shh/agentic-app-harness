export interface DestinationLeg {
  destination: string;
  days: number;
  startDate: string;
  endDate: string;
}

const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const addDaysToDateStr = (dateStr: string, n: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

// Splits a trip's total day count across N legs as evenly as possible, with
// the remainder given to the earliest legs (so a 7-day/3-leg trip is
// 3/2/2, never 2/2/3) — the same "first legs absorb the remainder" rule a
// human itinerary-planner would use.
export function splitTripDays(totalDays: number, legCount: number): number[] {
  if (legCount <= 0) return [];
  const safeDays = Math.max(0, totalDays);
  const base = Math.floor(safeDays / legCount);
  const remainder = safeDays % legCount;
  return Array.from({ length: legCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

// Turns an ordered list of destination names into contiguous, non-overlapping
// date-range legs. Blank entries are dropped before the split so they never
// consume a day, and a leg assigned zero days (more destinations than trip
// days) is excluded entirely rather than emitted with an empty range.
export function buildDestinationLegs(destinations: string[], totalDays: number, startDate: string): DestinationLeg[] {
  const trimmed = destinations.map((d) => d.trim()).filter((d) => d.length > 0);
  if (trimmed.length === 0) return [];

  const dayCounts = splitTripDays(totalDays, trimmed.length);
  const legs: DestinationLeg[] = [];
  let cursor = startDate;

  trimmed.forEach((destination, i) => {
    const days = dayCounts[i];
    if (days <= 0) return;
    const legStartDate = cursor;
    const legEndDate = addDaysToDateStr(legStartDate, days - 1);
    legs.push({ destination, days, startDate: legStartDate, endDate: legEndDate });
    cursor = addDaysToDateStr(legEndDate, 1);
  });

  return legs;
}
