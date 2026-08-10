// A trip much longer than a single laundry cycle doesn't need a fresh
// garment for every remaining day -- it needs enough for one cycle, worn on
// repeat between washes. Assumed weekly: most hotels, Airbnbs and
// laundromats support at least that turnaround.
export const LAUNDRY_CYCLE_DAYS = 7;

/**
 * The trip length actually used to size the wardrobe. With no laundry
 * access assumed, the full trip length is used (today's behavior --
 * pack a fresh item for every day). With laundry access assumed, the
 * length plateaus at LAUNDRY_CYCLE_DAYS once the trip runs longer than
 * one cycle, since the same garments get re-worn after washing.
 */
export function effectiveDurationForPacking(tripDuration: number, hasLaundryAccess: boolean): number {
  if (!hasLaundryAccess) return tripDuration;
  return Math.min(tripDuration, LAUNDRY_CYCLE_DAYS);
}
