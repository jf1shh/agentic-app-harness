import { describe, it, expect } from 'vitest';
import { CareTypeSchema } from '../schemas';
import type { CareType } from '../schemas';
import {
  COST_DATA_SOURCE,
  NATIONAL_MEDIANS,
  STATE_MEDIANS,
  CARE_TYPE_LABELS,
  SELECTABLE_CARE_TYPES,
  SURVEY_HOURS_PER_WEEK,
  resolveCost,
  hourlyToMonthlyCents,
} from './costOfCare';

// Backfilled coverage (.agents/AGENTS.md §5): the module already worked, so
// there is no Red step. Every case was proved by mutation — see the PR body.
//
// This dataset is the subject of two lessons already paid for:
//  - §6 "Cite Confidence, Not Just Sources" — every figure carries a confidence
//    tag, and a gap falls back to the national median *and says so*.
//  - §9.2 — PR #41 widened CareTypeSchema and left `Record<CareType, string>`
//    here unsatisfied, which failed type-check, broke `next build`, and meant
//    the Playwright stage never ran. The exhaustiveness cases below are the
//    runtime half of that guard: the compiler catches a missing key, and these
//    catch a key that exists but is empty, and a new member reaching the picker
//    with no price behind it.

const ALL_CARE_TYPES = CareTypeSchema.options as readonly CareType[];

describe('CARE_TYPE_LABELS', () => {
  it('Given every member of the CareType contract, When labels are looked up, Then each has a non-empty label', () => {
    for (const careType of ALL_CARE_TYPES) {
      expect(CARE_TYPE_LABELS[careType], `no label for '${careType}'`).toBeTruthy();
      expect(CARE_TYPE_LABELS[careType].trim().length).toBeGreaterThan(0);
    }
  });

  it('Given the label map, When its keys are compared with the contract, Then it declares no care type the contract does not have', () => {
    // A stale key survives a rename of the enum member and shows up as a
    // dropdown option that resolves to nothing.
    expect(Object.keys(CARE_TYPE_LABELS).sort()).toEqual([...ALL_CARE_TYPES].sort());
  });

  it('Given the label map, When labels are collected, Then no two care types read identically', () => {
    const labels = Object.values(CARE_TYPE_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('SELECTABLE_CARE_TYPES', () => {
  it('Given the picker list, When each entry is checked, Then all of them are valid care types with labels', () => {
    for (const careType of SELECTABLE_CARE_TYPES) {
      expect(ALL_CARE_TYPES).toContain(careType);
      expect(CARE_TYPE_LABELS[careType]).toBeTruthy();
    }
  });

  it('Given the picker list, When entries are counted, Then none is offered twice', () => {
    expect(new Set(SELECTABLE_CARE_TYPES).size).toBe(SELECTABLE_CARE_TYPES.length);
  });

  it('Given the picker list, When it is read, Then it offers exactly the care types a family can price today', () => {
    // Pinned as a set rather than checked for shape, because dropping an option
    // is invisible in the UI — the picker just gets shorter, and a family
    // concludes the app does not handle their situation. An earlier version of
    // this suite asserted only validity and uniqueness, and survived a mutation
    // that silently removed 'family_provided'.
    expect([...SELECTABLE_CARE_TYPES].sort()).toEqual([
      'adult_day_care',
      'assisted_living',
      'family_provided',
      'in_home_health_aide',
      'in_home_homemaker',
      'memory_care',
      'nursing_home_private',
      'nursing_home_semi',
    ]);
  });

  it('Given independent living, When the picker list is checked, Then it is deliberately withheld', () => {
    // Not an oversight: IL is priced from a buy-in contract that PlannerState
    // cannot capture from this picker, so offering it here would put a $0/month
    // option in front of a family with no way to correct it. Asserted so that
    // adding it back is a deliberate, visible change rather than a slip.
    expect(SELECTABLE_CARE_TYPES).not.toContain('independent_living');
  });

  it('Given every selectable care type, When its cost is resolved, Then a reference figure exists for it', () => {
    // The §9.2 failure in runtime form: a care type reaching the picker with no
    // cost data behind it is an option that cannot be priced.
    for (const careType of SELECTABLE_CARE_TYPES) {
      expect(resolveCost(careType, 'US'), `no cost data for '${careType}'`).not.toBeNull();
    }
  });
});

describe('NATIONAL_MEDIANS', () => {
  it('Given the national table, When care types are collected, Then no care type is priced twice', () => {
    // resolveCost takes the first match, so a duplicate would silently shadow.
    const careTypes = NATIONAL_MEDIANS.map((e) => e.careType);
    expect(new Set(careTypes).size).toBe(careTypes.length);
  });

  it('Given every national entry, When its confidence is read, Then it is one of the three declared tags', () => {
    for (const entry of NATIONAL_MEDIANS) {
      expect(['verified', 'needs_verification', 'derived'], `bad tag on '${entry.careType}'`)
        .toContain(entry.confidence);
    }
  });

  it('Given every national entry, When its figures are read, Then it carries at least one priced field', () => {
    for (const entry of NATIONAL_MEDIANS) {
      const priced = [entry.medianMonthlyCents, entry.medianHourlyCents, entry.medianDailyCents]
        .some((v) => v !== undefined);
      expect(priced, `'${entry.careType}' has no figure at all`).toBe(true);
    }
  });

  it('Given every entry that is not fully verified, When its note is read, Then it explains the weakness', () => {
    // The whole point of the confidence tag is that a reader can see *why* a
    // figure is soft. A `derived` or `needs_verification` entry with no note
    // launders the uncertainty back out of the dataset.
    for (const entry of NATIONAL_MEDIANS.filter((e) => e.confidence !== 'verified')) {
      expect(entry.note, `'${entry.careType}' is ${entry.confidence} with no note`).toBeTruthy();
    }
  });

  it('Given every national entry, When its figures are read, Then no cost is negative', () => {
    for (const entry of NATIONAL_MEDIANS) {
      for (const value of [entry.medianMonthlyCents, entry.medianHourlyCents, entry.medianDailyCents]) {
        if (value !== undefined) expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('Given memory care, When its confidence is read, Then it stays marked derived rather than verified', () => {
    // Memory care is not a surveyed category: the figure is assisted living
    // +25%, a commonly cited premium, and the note tells the family to treat it
    // as a placeholder. Relabelling it `verified` is precisely the "laundering
    // an uncertain figure into a confident one" the §6 lesson forbids, and it
    // passes every structural check — so it is asserted by name.
    const memoryCare = NATIONAL_MEDIANS.find((e) => e.careType === 'memory_care');
    expect(memoryCare?.confidence).toBe('derived');
    expect(memoryCare?.note?.toLowerCase()).toContain('placeholder');
  });

  it('Given the entries the survey did not price directly, When their tags are read, Then only the expected ones claim verification', () => {
    // Guards the ratio in both directions: silently promoting a soft figure to
    // `verified`, or demoting a real one, both change what the UI tells a
    // family about how much to trust the number.
    const verified = NATIONAL_MEDIANS.filter((e) => e.confidence === 'verified')
      .map((e) => e.careType).sort();
    expect(verified).toEqual([
      'assisted_living',
      'family_provided',
      'in_home_health_aide',
      'in_home_homemaker',
      'nursing_home_private',
      'nursing_home_semi',
    ]);
  });

  it('Given unpaid family care, When its figure is read, Then it is zero rather than absent', () => {
    // Zero is the honest fee; absent would make it unpriceable and push it down
    // the null branch of resolveCost.
    const family = NATIONAL_MEDIANS.find((e) => e.careType === 'family_provided');
    expect(family?.medianMonthlyCents).toBe(0);
  });

  it('Given the dataset source, When it is inspected, Then it names a survey and records that licensing is unconfirmed', () => {
    expect(COST_DATA_SOURCE.name).toBeTruthy();
    expect(COST_DATA_SOURCE.url).toMatch(/^https:\/\//);
    // Recorded as an open question in the spec; the UI leads with "enter your
    // own quote" precisely because this is false.
    expect(COST_DATA_SOURCE.licensingConfirmed).toBe(false);
  });
});

describe('resolveCost', () => {
  it('Given a care type and any state, When the cost is resolved, Then the entry matches the care type asked for', () => {
    const resolved = resolveCost('assisted_living', 'US');
    expect(resolved?.entry.careType).toBe('assisted_living');
    expect(resolved?.entry.medianMonthlyCents).toBe(620_000);
  });

  it('Given a state with no transcribed figure, When the cost is resolved, Then it falls back to the national median AND says so', () => {
    // "Says so" is the requirement, not the fallback itself: a silent fallback
    // presents a national number as if it were a state one.
    const resolved = resolveCost('assisted_living', 'CA');
    expect(resolved?.isNationalFallback).toBe(true);
    expect(resolved?.entry.stateCode).toBe('US');
  });

  it('Given the state table is deliberately empty, When any state is resolved, Then every lookup is a labelled fallback', () => {
    // Guards the documented decision in both directions: if state figures are
    // ever transcribed, this case fails and forces the flag to be re-examined.
    //
    // Worth knowing: while STATE_MEDIANS is empty the `if (state)` branch in
    // resolveCost is unreachable, so mutating *its* isNationalFallback to true
    // cannot be caught from outside the module. That is not a hole this suite
    // can close — it is what the emptiness assertion below exists to flag. The
    // first state figure transcribed turns that branch live and this case red
    // at the same moment, which is when the flag needs checking.
    expect(STATE_MEDIANS).toHaveLength(0);
    for (const careType of SELECTABLE_CARE_TYPES) {
      expect(resolveCost(careType, 'NY')?.isNationalFallback).toBe(true);
    }
  });

  it('Given independent living, When its cost is resolved, Then null is returned because it is priced from a contract', () => {
    // Correct answer, not a gap: IL is housing, not a surveyed care category,
    // and §7 forbids inventing a median. It is priced from the community's own
    // buy-in contract instead.
    expect(resolveCost('independent_living', 'US')).toBeNull();
  });
});

describe('hourlyToMonthlyCents', () => {
  it('Given an hourly rate and weekly hours, When converted, Then it annualises over 52 weeks and divides into 12 months', () => {
    // $35/hr at 44 hrs/week = $80,080/yr = $6,673.33/month.
    expect(hourlyToMonthlyCents(3_500, 44)).toBe(667_333);
  });

  it('Given the survey hours assumption, When it is read, Then it matches the basis of the published annual figure', () => {
    expect(SURVEY_HOURS_PER_WEEK).toBe(44);
  });

  it('Given fewer weekly hours, When converted, Then the monthly cost falls proportionally', () => {
    const full = hourlyToMonthlyCents(3_500, 44);
    const half = hourlyToMonthlyCents(3_500, 22);
    expect(half).toBeCloseTo(full / 2, -1);
  });

  it('Given zero hours or a zero rate, When converted, Then the monthly cost is zero', () => {
    expect(hourlyToMonthlyCents(3_500, 0)).toBe(0);
    expect(hourlyToMonthlyCents(0, 44)).toBe(0);
  });

  it('Given a conversion that lands between cents, When converted, Then the result is a whole number of cents', () => {
    // Money is held in integer cents throughout; a fractional cent here would
    // propagate into every downstream total.
    const result = hourlyToMonthlyCents(3_333, 37);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("the hourly-rate band rows (spec §11.10)", () => {
  // Mirrors the band-symmetry rule feeStructures.test.ts:72-77 already asserts
  // on the residential add-on bands, applied at hourly-cents scale for the two
  // hourly-care rows. The band is the same between in_home_homemaker and
  // in_home_health_aide because the 2025 Genworth survey merged those two
  // care types into a single published hourly figure (costOfCare.ts note).
  it("Given an hourly-care row, When lowHourlyCents and highHourlyCents are read, Then low <= high and both are positive", () => {
    const hourly = NATIONAL_MEDIANS.filter(
      (e) => e.careType === "in_home_homemaker" || e.careType === "in_home_health_aide",
    );
    expect(hourly.length).toBe(2);

    for (const entry of hourly) {
      expect(entry.lowHourlyCents, `${entry.careType} missing lowHourlyCents`).toBeDefined();
      expect(entry.highHourlyCents, `${entry.careType} missing highHourlyCents`).toBeDefined();
      expect(entry.lowHourlyCents as number, `${entry.careType} low <= 0`).toBeGreaterThan(0);
      expect(entry.highHourlyCents as number, `${entry.careType} high <= 0`).toBeGreaterThan(0);
      expect(entry.lowHourlyCents as number).toBeLessThanOrEqual(entry.highHourlyCents as number);
    }
  });

  it("Given the published non-medical caregiver median, When it is checked against each band, Then it sits inside the band", () => {
    // 3500 is the implicit midpoint of the band per §11.10 / Rev 12 banner.
    // PlanState keeps using medianHourlyCents as the single user-side figure;
    // the slider UI reads the band separately. Keeping the median inside the
    // band here means the two cannot drift past one another unnoticed.
    const MEDIAN = 3500;
    const hourly = NATIONAL_MEDIANS.filter(
      (e) => e.careType === "in_home_homemaker" || e.careType === "in_home_health_aide",
    );
    for (const entry of hourly) {
      expect(entry.lowHourlyCents).toBeDefined();
      expect(entry.highHourlyCents).toBeDefined();
      expect(entry.lowHourlyCents as number, `${entry.careType} band lower than the published median`).toBeLessThanOrEqual(MEDIAN);
      expect(entry.highHourlyCents as number, `${entry.careType} band higher than the published median`).toBeGreaterThanOrEqual(MEDIAN);
    }
  });
});
