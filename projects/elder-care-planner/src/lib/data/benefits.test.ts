import { describe, it, expect } from 'vitest';
import { BENEFIT_CARDS, BENEFITS_CHECKED_ON } from './benefits';

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; proved by mutation.
//
// The Medicare card carries the single most expensive misconception in the
// domain — that Medicare pays for long-term custodial care. The §6 lesson
// "Collapsing a Page Hides Whatever the Page Was Promising" is about that
// correction going behind a click; these cases guard the layer beneath it, that
// the correction exists in the data at all and still says what it must.

describe('BENEFIT_CARDS', () => {
  it('Given the benefit cards, When ids are collected, Then each programme appears once', () => {
    const ids = BENEFIT_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Given the benefit cards, When ids are read, Then the four funding routes families ask about are all covered', () => {
    // Omitting one does not render an error; it renders a shorter list that
    // looks complete, which is how a family concludes a route does not exist.
    expect(BENEFIT_CARDS.map((c) => c.id).sort())
      .toEqual(['ltc_insurance', 'medicaid', 'medicare', 'va_aid_attendance']);
  });

  it('Given every benefit card, When its copy is read, Then every field a family relies on is populated', () => {
    for (const card of BENEFIT_CARDS) {
      expect(card.name, `'${card.id}' has no name`).toBeTruthy();
      expect(card.headline, `'${card.id}' has no headline`).toBeTruthy();
      expect(card.timingTrap, `'${card.id}' has no timing trap`).toBeTruthy();
      expect(card.nextStep, `'${card.id}' has no next step`).toBeTruthy();
      expect(card.sourceNote, `'${card.id}' has no source note`).toBeTruthy();
    }
  });

  it('Given every benefit card, When its coverage lists are read, Then it states both what is and is not covered', () => {
    // A card listing only what a programme covers is the optimistic half of the
    // truth, and the omitted half is where the money is lost.
    for (const card of BENEFIT_CARDS) {
      expect(card.covers.length, `'${card.id}' lists nothing it covers`).toBeGreaterThan(0);
      expect(card.doesNotCover.length, `'${card.id}' lists nothing it excludes`).toBeGreaterThan(0);
    }
  });

  it('Given the Medicare card, When its headline is read, Then it still states that long-term custodial care is not covered', () => {
    // The correction the results page exists to deliver. Asserted on the exact
    // claim rather than on the card's presence, because a card that softened
    // this would pass every structural check above.
    const medicare = BENEFIT_CARDS.find((c) => c.id === 'medicare');
    expect(medicare?.headline.toLowerCase()).toContain('does not pay');
    expect(medicare?.headline.toLowerCase()).toContain('long-term');
  });

  it('Given the Medicare card, When its exclusions are read, Then assisted living and custodial help are named explicitly', () => {
    const medicare = BENEFIT_CARDS.find((c) => c.id === 'medicare');
    const exclusions = medicare!.doesNotCover.join(' ').toLowerCase();
    expect(exclusions).toContain('assisted living');
    expect(exclusions).toContain('custodial');
  });

  it('Given the Medicare card, When its timing trap is read, Then the 100-day ceiling is stated', () => {
    // Families plan around a benefit they believe is open-ended. The cap is the
    // number that changes the plan.
    const medicare = BENEFIT_CARDS.find((c) => c.id === 'medicare');
    expect(medicare?.timingTrap).toContain('100 days');
  });

  it('Given the checked-on date, When it is read, Then it is a real ISO date', () => {
    // Benefit rules change; an undated card cannot be judged stale by a reader.
    expect(BENEFITS_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(BENEFITS_CHECKED_ON))).toBe(false);
  });
});
