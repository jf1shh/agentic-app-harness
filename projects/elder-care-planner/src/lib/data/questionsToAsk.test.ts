import { describe, it, expect } from 'vitest';
import { CareTypeSchema } from '../schemas';
import type { CareType } from '../schemas';
import { ATTORNEY_QUESTIONS, questionsFor } from './questionsToAsk';

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; proved by mutation.
//
// The attorney list is the app's referral boundary: it deliberately does not
// model Medicaid eligibility or tax positions (§1.1), and instead hands the
// family the questions worth paying for. A care type that silently returns no
// attorney group would drop that boundary exactly where the stakes are highest.

const ALL_CARE_TYPES = CareTypeSchema.options as readonly CareType[];

describe('questionsFor', () => {
  it('Given every member of the CareType contract, When questions are requested, Then some group is always returned', () => {
    // Exhaustive over the enum, so widening CareType surfaces here rather than
    // as an empty panel in the UI (the §9.2 blast-radius failure).
    for (const careType of ALL_CARE_TYPES) {
      expect(questionsFor(careType).length, `no questions for '${careType}'`).toBeGreaterThan(0);
    }
  });

  it('Given every member of the CareType contract, When questions are requested, Then the attorney group is always included', () => {
    for (const careType of ALL_CARE_TYPES) {
      const ids = questionsFor(careType).map((g) => g.id);
      expect(ids, `attorney group missing for '${careType}'`).toContain('attorney');
    }
  });

  it('Given a residential care type, When questions are requested, Then the community questions come before the attorney ones', () => {
    // Order is the reading order in the panel: the thing to ask before signing
    // belongs above the thing to ask a lawyer later.
    const groups = questionsFor('assisted_living');
    expect(groups.map((g) => g.id)).toEqual(['residential', 'attorney']);
  });

  it.each<CareType>(['assisted_living', 'memory_care', 'nursing_home_semi', 'nursing_home_private'])(
    'Given the residential care type %s, When questions are requested, Then the community list is used',
    (careType) => {
      expect(questionsFor(careType).map((g) => g.id)).toContain('residential');
    });

  it.each<CareType>(['in_home_homemaker', 'in_home_health_aide'])(
    'Given the hourly care type %s, When questions are requested, Then the agency list is used rather than the community one',
    (careType) => {
      const ids = questionsFor(careType).map((g) => g.id);
      expect(ids).not.toContain('residential');
      expect(ids.length).toBeGreaterThan(1);
    });

  it('Given adult day care, When questions are requested, Then it gets its own list rather than falling through to attorney-only', () => {
    const groups = questionsFor('adult_day_care');
    expect(groups).toHaveLength(2);
    expect(groups[0].id).not.toBe('attorney');
  });

  it('Given a care type with no dedicated list, When questions are requested, Then only the attorney group is returned', () => {
    // family_provided has no provider to interrogate, so attorney-only is the
    // correct answer — asserted so it is distinguishable from a missing branch.
    expect(questionsFor('family_provided').map((g) => g.id)).toEqual(['attorney']);
  });

  it('Given any care type, When the returned groups are inspected, Then no group appears twice', () => {
    for (const careType of ALL_CARE_TYPES) {
      const ids = questionsFor(careType).map((g) => g.id);
      expect(new Set(ids).size, `duplicate group for '${careType}'`).toBe(ids.length);
    }
  });

  it('Given any returned group, When its contents are read, Then it carries a title, an intro and questions', () => {
    for (const careType of ALL_CARE_TYPES) {
      for (const group of questionsFor(careType)) {
        expect(group.title, `'${group.id}' has no title`).toBeTruthy();
        expect(group.intro, `'${group.id}' has no intro`).toBeTruthy();
        expect(group.questions.length, `'${group.id}' has no questions`).toBeGreaterThan(0);
        for (const question of group.questions) {
          expect(question.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('ATTORNEY_QUESTIONS', () => {
  it('Given the attorney list, When it is read, Then it names the referred-out territory it exists to cover', () => {
    // These are the two subjects the app refuses to answer itself. If the list
    // stops mentioning them, the referral has quietly narrowed.
    const text = [ATTORNEY_QUESTIONS.intro, ...ATTORNEY_QUESTIONS.questions].join(' ').toLowerCase();
    expect(text).toContain('medicaid');
    expect(text).toContain('deduction');
  });

  it('Given the attorney list, When its questions are counted, Then it is substantive rather than a token line', () => {
    expect(ATTORNEY_QUESTIONS.questions.length).toBeGreaterThanOrEqual(5);
  });
});
