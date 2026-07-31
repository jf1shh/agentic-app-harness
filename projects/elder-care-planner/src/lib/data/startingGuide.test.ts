/**
 * Unit tests for the starting-guide resources (spec §11.13).
 *
 * The load-bearing assertion is the funding disclosure. A referral service paid
 * a commission by the communities it recommends is genuinely useful and
 * genuinely conflicted, and a reader weighing its touring checklist needs to
 * know which. That is the same structural rule §11.10 applies to a derived
 * figure needing its own note — and like that one, it is enforced here rather
 * than left to whoever next edits the list.
 */
import { describe, it, expect } from 'vitest';
import {
  STARTING_GUIDE_GROUPS,
  TOURING_GUIDANCE,
  allGuideResources,
  needsFundingDisclosure,
  type ResourceFunding,
} from './startingGuide';

describe('Given the starting-guide resource list', () => {
  it('When the groups are read, Then every stage of the search is represented', () => {
    const ids = STARTING_GUIDE_GROUPS.map((g) => g.id);
    expect(ids).toContain('in_home');
    expect(ids).toContain('touring');
    expect(ids).toContain('legal_financial');
    expect(ids).toContain('moving');
    expect(ids).toContain('other');
  });

  it('When each group is read, Then it has a title, an intro and at least one resource', () => {
    for (const group of STARTING_GUIDE_GROUPS) {
      expect(group.title, `${group.id} title`).toBeTruthy();
      expect(group.intro, `${group.id} intro`).toBeTruthy();
      expect(group.resources.length, `${group.id} resources`).toBeGreaterThan(0);
    }
  });

  it('When resource ids are collected, Then they are unique', () => {
    const ids = allGuideResources().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Given resources that are paid by the providers they recommend', () => {
  it('When a commercial or referral resource is read, Then it carries a note naming the conflict', () => {
    // The editorial rule this section exists to hold. A paid-referral link
    // presented as neutral guidance is the §6 laundering failure applied to
    // advice rather than to a number.
    const conflicted = allGuideResources().filter((r) => needsFundingDisclosure(r.funding));
    expect(conflicted.length, 'the guide names commercial services, so some must be flagged')
      .toBeGreaterThan(0);

    for (const resource of conflicted) {
      expect(resource.fundingNote, `${resource.id} must disclose how it is paid`).toBeTruthy();
    }
  });

  it('When a government or nonprofit resource is read, Then it is not flagged as needing disclosure', () => {
    expect(needsFundingDisclosure('government')).toBe(false);
    expect(needsFundingDisclosure('nonprofit')).toBe(false);
    expect(needsFundingDisclosure('commercial_referral')).toBe(true);
    expect(needsFundingDisclosure('commercial')).toBe(true);
  });

  it('When every resource is read, Then each carries a funding label from the known set', () => {
    const known: ResourceFunding[] = ['government', 'nonprofit', 'commercial_referral', 'commercial'];
    for (const resource of allGuideResources()) {
      expect(known, `${resource.id} funding`).toContain(resource.funding);
    }
  });

  it('When the referral services named in the source guide are looked up, Then they are labelled as paid referrals rather than neutral', () => {
    // Named explicitly because these are the ones a reader is most likely to
    // meet first, and most likely to mistake for impartial directories.
    const byId = new Map(allGuideResources().map((r) => [r.id, r]));
    expect(byId.get('a_place_for_mom')?.funding).toBe('commercial_referral');
    expect(byId.get('a_place_for_mom')?.fundingNote).toMatch(/paid|commission/i);
  });
});

describe('Given the app declines to name a best option (§11.2)', () => {
  it('When any resource or touring step is read, Then none is described as best, top or recommended', () => {
    const text = [
      ...allGuideResources().flatMap((r) => [r.name, r.what, r.fundingNote ?? '']),
      ...TOURING_GUIDANCE.map((t) => `${t.title} ${t.detail}`),
      ...STARTING_GUIDE_GROUPS.map((g) => `${g.title} ${g.intro}`),
    ].join(' ');

    expect(text).not.toMatch(/\bbest\b|\btop-rated\b|\bwe recommend\b|\brecommended\b/i);
  });
});

describe('Given the touring guidance', () => {
  it('When it is read, Then it covers visiting in person and speaking to care staff', () => {
    const text = TOURING_GUIDANCE.map((t) => `${t.title} ${t.detail}`).join(' ').toLowerCase();
    expect(text).toContain('in person');
    expect(text).toMatch(/care staff|staff/);
  });

  it('When each step is read, Then it has both a title and a detail', () => {
    for (const step of TOURING_GUIDANCE) {
      expect(step.title, 'touring step title').toBeTruthy();
      expect(step.detail, 'touring step detail').toBeTruthy();
    }
  });
});
