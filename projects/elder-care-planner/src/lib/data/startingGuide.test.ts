/**
 * Tests for §11.11's curated directory.
 *
 * Per .agents/AGENTS.md §5, vitest-first: cover the happy paths (every entry
 * validates; categories are distinct; intake tally is honest; URL format is
 * valid for entries that have one) and prove each can fail by feeding
 * intentionally malformed input. The fixture is intentionally large enough
 * that a quiet failure (e.g. an enum member silently disappearing from
 * CATEGORY_LABELS) would be visible.
 *
 * Every scenario below is written in BDD `Given / When / Then` form so the
 * harness-status unit-test-coverage gate recognizes this file. The tests
 * themselves map each `Given ... / When ... / Then ...` onto a single vitest
 * `it()`, with the BDD keywords in the name rather than three nested levels
 * of `describe`/`test`/`it`.
 */
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABELS,
  GUIDE_CATEGORY_ORDER,
  GUIDE_ENTRY_BY_ID,
  GuideCategorySchema,
  GuideEntrySchema,
  GuideIntakeSchema,
  STARTING_GUIDE_CHECKED_ON,
  STARTING_GUIDE_ENTRIES,
} from './startingGuide';

describe('startingGuide data contract', () => {
  it('Given the curated entries, When parsed against GuideEntrySchema, Then every entry validates and round-trips equality', () => {
    for (const entry of STARTING_GUIDE_ENTRIES) {
      const parsed = GuideEntrySchema.parse(entry);
      expect(parsed).toEqual(entry);
    }
  });

  it('Given the curated entries, When I collect ids, Then every id is unique', () => {
    const ids = STARTING_GUIDE_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Given the curated entries and the ID lookup, When I dereference by id, Then every curated entry is reachable', () => {
    for (const entry of STARTING_GUIDE_ENTRIES) {
      expect(GUIDE_ENTRY_BY_ID[entry.id]).toEqual(entry);
    }
  });

  it('Given the five categories, When the curated list is grouped, Then every category is present', () => {
    const present = new Set(STARTING_GUIDE_ENTRIES.map((e) => e.category));
    expect(present).toEqual(new Set(GUIDE_CATEGORY_ORDER));
  });

  it('Given every category in the enum, When I read CATEGORY_LABELS, Then a non-empty heading and intro are present', () => {
    for (const cat of GuideCategorySchema.options) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
      expect(CATEGORY_LABELS[cat].heading.length).toBeGreaterThan(0);
      expect(CATEGORY_LABELS[cat].intro.length).toBeGreaterThan(0);
    }
  });

  it('Given every curated entry, When I read the intake field, Then it is one of the three enum values', () => {
    for (const entry of STARTING_GUIDE_ENTRIES) {
      expect(GuideIntakeSchema.options).toContain(entry.intake);
    }
  });

  it('Given every curated entry that has a URL, When I parse the URL, Then it is well-formed', () => {
    for (const entry of STARTING_GUIDE_ENTRIES) {
      const url = entry.url;
      if (url === undefined) continue;
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it('Given the curated entries, When I read checkedOn, Then every entry uses the same revision-stamped date', () => {
    for (const entry of STARTING_GUIDE_ENTRIES) {
      expect(entry.checkedOn).toBe(STARTING_GUIDE_CHECKED_ON);
    }
  });

  it('Given the spec’s AC1 invariant, When the curated list is counted by category, Then every category has at least one entry', () => {
    const counts = new Map<string, number>();
    for (const entry of STARTING_GUIDE_ENTRIES) {
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    }
    for (const cat of GuideCategorySchema.options) {
      expect(counts.get(cat) ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('startingGuide regression — prove the tests can fail', () => {
  it('Given an unknown intake value, When the schema is asked to parse it, Then parsing throws', () => {
    expect(() =>
      GuideEntrySchema.parse({
        id: 'malformed',
        category: 'in_home_care',
        label: 'Test',
        note: 'Test',
        intake: 'subscription-based', // wrong
        confidence: 'verified',
        checkedOn: '2026-07-29',
      }),
    ).toThrow();
  });

  it('Given an unknown category, When the schema is asked to parse it, Then parsing throws', () => {
    expect(() =>
      GuideEntrySchema.parse({
        id: 'malformed',
        category: 'home_modifications',
        label: 'Test',
        note: 'Test',
        intake: 'free',
        confidence: 'verified',
        checkedOn: '2026-07-29',
      }),
    ).toThrow();
  });

  it('Given a malformed checkedOn date, When the schema is asked to parse it, Then parsing throws', () => {
    expect(() =>
      GuideEntrySchema.parse({
        id: 'malformed',
        category: 'in_home_care',
        label: 'Test',
        note: 'Test',
        intake: 'free',
        confidence: 'verified',
        checkedOn: 'tomorrow',
      }),
    ).toThrow();
  });

  it('Given a non-URL string in the url field, When the schema is asked to parse it, Then parsing throws', () => {
    expect(() =>
      GuideEntrySchema.parse({
        id: 'malformed',
        category: 'in_home_care',
        label: 'Test',
        url: 'not-a-url',
        note: 'Test',
        intake: 'free',
        confidence: 'verified',
        checkedOn: '2026-07-29',
      }),
    ).toThrow();
  });

  it('Given the personal-referrals shape (no url), When the schema is asked to parse it, Then parsing succeeds', () => {
    expect(() =>
      GuideEntrySchema.parse({
        id: 'personal-referrals-shape',
        category: 'in_home_care',
        label: 'Personal referrals',
        note: 'Ask the network.',
        intake: 'unknown',
        confidence: 'verified',
        checkedOn: '2026-07-29',
      }),
    ).not.toThrow();
  });
});
