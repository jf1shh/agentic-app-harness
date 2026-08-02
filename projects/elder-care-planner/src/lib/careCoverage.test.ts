/**
 * Unit tests for the weekly care-coverage grid (spec §11.15).
 *
 * This is a typical-week pattern, never a calendar date — the same paradigm
 * every other hours figure in this app already uses. The arithmetic here
 * exists to make `providesUnpaidHoursPerWeek` checkable rather than a number
 * typed with no way to reconstruct where it came from.
 */
import { describe, it, expect } from 'vitest';
import {
  DAYS,
  BLOCKS,
  BLOCK_HOURS,
  TOTAL_BLOCKS,
  coveredHoursForContributor,
  uncoveredBlockCount,
  uncoveredHoursPerWeek,
  slotAt,
  setSlot,
  type CareCoverageSlot,
} from './careCoverage';

describe('Given the grid dimensions', () => {
  it('When counted, Then the total blocks is days times blocks-per-day', () => {
    expect(TOTAL_BLOCKS).toBe(DAYS.length * BLOCKS.length);
  });

  it('When read, Then a full week of block hours accounts for all 24 hours a day', () => {
    // Four blocks a day; each should be a sixth of the day so the total maps
    // cleanly onto 24 hours, not an arbitrary number nobody can reconstruct.
    expect(BLOCKS.length * BLOCK_HOURS).toBe(24);
  });
});

describe('Given an empty coverage grid', () => {
  it('When a contributor\'s covered hours are read, Then they are zero', () => {
    expect(coveredHoursForContributor([], 'c1')).toBe(0);
  });

  it('When the uncovered count is read, Then every block is uncovered', () => {
    expect(uncoveredBlockCount([], ['c1'])).toBe(TOTAL_BLOCKS);
    expect(uncoveredHoursPerWeek([], ['c1'])).toBe(TOTAL_BLOCKS * BLOCK_HOURS);
  });

  it('When a cell is read, Then nothing is assigned to it', () => {
    expect(slotAt([], 'mon', 'morning')).toBeUndefined();
  });
});

describe('Given cells assigned to a contributor', () => {
  const coverage: CareCoverageSlot[] = [
    { day: 'mon', block: 'morning', contributorId: 'c1' },
    { day: 'mon', block: 'afternoon', contributorId: 'c1' },
    { day: 'tue', block: 'morning', contributorId: 'c2' },
  ];

  it('When their covered hours are read, Then it is the block count times the block length', () => {
    expect(coveredHoursForContributor(coverage, 'c1')).toBe(2 * BLOCK_HOURS);
    expect(coveredHoursForContributor(coverage, 'c2')).toBe(1 * BLOCK_HOURS);
  });

  it('When a contributor with no assigned cells is read, Then their hours are zero', () => {
    expect(coveredHoursForContributor(coverage, 'c3')).toBe(0);
  });

  it('When the uncovered count is read, Then only the assigned cells are excluded', () => {
    expect(uncoveredBlockCount(coverage, ['c1', 'c2'])).toBe(TOTAL_BLOCKS - 3);
  });

  it('When a covered cell is read directly, Then the assignment is returned', () => {
    expect(slotAt(coverage, 'mon', 'morning')).toEqual({
      day: 'mon',
      block: 'morning',
      contributorId: 'c1',
    });
  });
});

describe('Given a cell assigned to a contributor who is no longer listed', () => {
  const coverage: CareCoverageSlot[] = [{ day: 'wed', block: 'evening', contributorId: 'ghost' }];

  it('When the uncovered count is read, Then a cell held by nobody currently listed counts as uncovered', () => {
    // Mirrors the ledger's orphan handling in spirit, but the other way: the
    // raw assignment is not deleted (a family may re-add the same person),
    // but it must not silently make a block look staffed when it is not.
    expect(uncoveredBlockCount(coverage, ['c1', 'c2'])).toBe(TOTAL_BLOCKS);
  });
});

describe('Given setSlot is used to assign or clear a cell', () => {
  it('When a cell is assigned, Then it appears at that day and block', () => {
    const next = setSlot([], 'fri', 'evening', 'c1');
    expect(slotAt(next, 'fri', 'evening')).toEqual({
      day: 'fri',
      block: 'evening',
      contributorId: 'c1',
    });
  });

  it('When an already-assigned cell is reassigned, Then the old assignment is replaced, not duplicated', () => {
    const first = setSlot([], 'fri', 'evening', 'c1');
    const reassigned = setSlot(first, 'fri', 'evening', 'c2');
    expect(reassigned).toHaveLength(1);
    expect(slotAt(reassigned, 'fri', 'evening')?.contributorId).toBe('c2');
  });

  it('When a cell is cleared, Then it is removed rather than left assigned to nobody', () => {
    const assigned = setSlot([], 'fri', 'evening', 'c1');
    const cleared = setSlot(assigned, 'fri', 'evening', null);
    expect(cleared).toHaveLength(0);
    expect(slotAt(cleared, 'fri', 'evening')).toBeUndefined();
  });

  it('When one cell is changed, Then every other cell is left untouched', () => {
    const base: CareCoverageSlot[] = [{ day: 'mon', block: 'morning', contributorId: 'c1' }];
    const next = setSlot(base, 'tue', 'afternoon', 'c2');
    expect(slotAt(next, 'mon', 'morning')).toEqual(base[0]);
    expect(next).toHaveLength(2);
  });
});
