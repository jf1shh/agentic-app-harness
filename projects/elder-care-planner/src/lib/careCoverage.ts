/**
 * Weekly care-coverage grid (spec §11.15).
 *
 * A typical-week pattern, never a calendar date — every hours figure this app
 * already shows (`hoursPerWeek`, `providesUnpaidHoursPerWeek`) means "a
 * typical week," and this stays in that paradigm on purpose. The literal
 * "scheduler" — dated shifts, reminders, shift trading — was considered and
 * declined in §11.15 as scope creep away from a cost planner into a
 * caregiving-coordination app.
 *
 * The point of the grid is not the grid — it is making
 * `Contributor.providesUnpaidHoursPerWeek` checkable rather than a number
 * typed with no way to reconstruct where it came from, the same move §11.12
 * already made for the home-cost lump sum.
 */
import type { CareCoverageSlot, DayOfWeek, CareTimeBlock } from './schemas';
export type { CareCoverageSlot };

export const DAYS: readonly DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const BLOCKS: readonly CareTimeBlock[] = ['morning', 'afternoon', 'evening', 'overnight'];
export const BLOCK_LABELS: Record<CareTimeBlock, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  overnight: 'Overnight',
};

/** Each of the four blocks is a sixth of the day, so they account for all 24 hours. */
export const BLOCK_HOURS = 6;

export const TOTAL_BLOCKS = DAYS.length * BLOCKS.length;

function key(day: DayOfWeek, block: CareTimeBlock): string {
  return `${day}:${block}`;
}

/** The block a given contributor is assigned to, if any. */
export function slotAt(
  coverage: readonly CareCoverageSlot[],
  day: DayOfWeek,
  block: CareTimeBlock,
): CareCoverageSlot | undefined {
  return coverage.find((s) => s.day === day && s.block === block);
}

/** A contributor's weekly hours, as the grid actually has them covering. */
export function coveredHoursForContributor(
  coverage: readonly CareCoverageSlot[],
  contributorId: string,
): number {
  return coverage.filter((s) => s.contributorId === contributorId).length * BLOCK_HOURS;
}

/**
 * How many of the 28 weekly blocks have nobody currently listed covering
 * them. A block assigned to a contributor id that is no longer in
 * `validContributorIds` counts as uncovered — the raw assignment is not
 * deleted (a family may re-add the same person), but a block cannot look
 * staffed by someone who is not there to staff it.
 */
export function uncoveredBlockCount(
  coverage: readonly CareCoverageSlot[],
  validContributorIds: readonly string[],
): number {
  const covered = new Set(
    coverage
      .filter((s) => validContributorIds.includes(s.contributorId))
      .map((s) => key(s.day, s.block)),
  );
  return TOTAL_BLOCKS - covered.size;
}

export function uncoveredHoursPerWeek(
  coverage: readonly CareCoverageSlot[],
  validContributorIds: readonly string[],
): number {
  return uncoveredBlockCount(coverage, validContributorIds) * BLOCK_HOURS;
}

/**
 * Assign a cell to a contributor, or clear it with `contributorId: null`.
 * Replaces any existing assignment at that cell rather than duplicating it.
 */
export function setSlot(
  coverage: readonly CareCoverageSlot[],
  day: DayOfWeek,
  block: CareTimeBlock,
  contributorId: string | null,
): CareCoverageSlot[] {
  const without = coverage.filter((s) => !(s.day === day && s.block === block));
  return contributorId ? [...without, { day, block, contributorId }] : without;
}
