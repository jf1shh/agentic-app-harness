import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEIGHT,
  MAX_FACILITIES,
  compareFacilities,
  costConsequence,
  dimensionRows,
  formatComposite,
  resolveWeights,
  scoreFacility,
} from './fit';
import {
  FACILITY_DIMENSIONS,
  FacilityNoteSchema,
  type FacilityNote,
  type FacilityWeight,
} from '../schemas';

/**
 * The facility shortlist (spec §11.2).
 *
 * The arithmetic here is trivial and the judgement is not, so most of these
 * tests are about what the engine refuses to do: score an unassessed dimension
 * as zero, count a dimension the family said does not matter, or put the
 * communities in an order that amounts to picking one.
 *
 * The golden figures below are hand-computed and the working is written out
 * beside them (spec §8) — a fixture captured from the implementation would
 * prove only that the code agrees with itself.
 */

function facility(overrides: Partial<FacilityNote> = {}): FacilityNote {
  return FacilityNoteSchema.parse({
    id: 'f1',
    label: 'Oakmont',
    careType: 'assisted_living',
    ...overrides,
  });
}

/**
 * A full set of scores.
 *
 * community 4, food 5, activities 3, apartment 4, staff 2, location 5,
 * upkeep 4, gut 3.
 */
const FULL_SCORES = [
  { dimension: 'community' as const, score: 4 },
  { dimension: 'food' as const, score: 5 },
  { dimension: 'activities' as const, score: 3 },
  { dimension: 'apartment' as const, score: 4 },
  { dimension: 'staff' as const, score: 2 },
  { dimension: 'location' as const, score: 5 },
  { dimension: 'upkeep' as const, score: 4 },
  { dimension: 'gut' as const, score: 3 },
];

/** food matters a lot, staff decides it, location does not matter at all. */
const WEIGHTS: FacilityWeight[] = [
  { dimension: 'food', weight: 2 },
  { dimension: 'staff', weight: 3 },
  { dimension: 'location', weight: 0 },
];

describe('Given a family has weighted only some of the dimensions', () => {
  it('When the weights are resolved, Then every dimension has one and the unstated ones take the default', () => {
    // Given three dimensions weighted explicitly
    const resolved = resolveWeights(WEIGHTS);

    // Then the stated ones are as stated
    expect(resolved.food).toBe(2);
    expect(resolved.staff).toBe(3);
    expect(resolved.location).toBe(0);

    // And every other dimension resolves rather than being absent — consumers
    // index this record without a fallback of their own
    for (const { dimension } of FACILITY_DIMENSIONS) {
      expect(resolved[dimension], `${dimension} has no weight`).toBeTypeOf('number');
    }
    expect(resolved.upkeep).toBe(DEFAULT_WEIGHT);
  });

  it('When a dimension is weighted twice, Then the last entry wins deterministically', () => {
    // Given a duplicated dimension, as a hand-edited payload could produce
    const resolved = resolveWeights([
      { dimension: 'food', weight: 1 },
      { dimension: 'food', weight: 3 },
    ]);

    // Then the result does not depend on iteration luck
    expect(resolved.food).toBe(3);
  });
});

describe('Given a community scored on every dimension', () => {
  it('When its weighted score is worked out, Then it matches the hand-computed figure', () => {
    // Given all eight dimensions scored, with food at weight 2, staff at 3 and
    // location at 0
    const fit = scoreFacility(facility({ ratings: FULL_SCORES }), resolveWeights(WEIGHTS));

    // Hand-computed:
    //   community 4×1 =  4
    //   food      5×2 = 10
    //   activities3×1 =  3
    //   apartment 4×1 =  4
    //   staff     2×3 =  6
    //   upkeep    4×1 =  4
    //   gut       3×1 =  3
    //                   ---
    //   points          34   over weights 1+2+1+1+3+1+1 = 10
    //   34 ÷ 10 = 3.4
    expect(fit.weightedPointsTotal).toBe(34);
    expect(fit.weightTotal).toBe(10);
    expect(fit.compositeScore).toBeCloseTo(3.4, 10);
  });

  it('When a dimension is weighted at nothing, Then it is excluded and named as excluded', () => {
    // Given location weighted "doesn't matter", and scored 5
    const fit = scoreFacility(facility({ ratings: FULL_SCORES }), resolveWeights(WEIGHTS));

    // Then it is not among the parts
    expect(fit.parts.map((p) => p.dimension)).not.toContain('location');

    // And the reason is recorded separately from "nobody assessed it", because
    // "we did not look" and "we do not care" are different facts
    expect(fit.notWeighted).toEqual(['location']);
    expect(fit.unrated).toEqual([]);

    // And its 5 — the highest score on the card — did not lift the composite
    expect(fit.compositeScore).toBeCloseTo(3.4, 10);
  });

  it('When the products are summed, Then they reach the stated points total exactly', () => {
    // Given the parts the derivation panel will display
    const fit = scoreFacility(facility({ ratings: FULL_SCORES }), resolveWeights(WEIGHTS));

    // When each part's score × weight is added up
    const summed = fit.parts.reduce((total, p) => total + p.score * p.weight, 0);

    // Then it equals the total the panel states, and that total over the stated
    // weight is the composite the panel displays (spec §11.2.5)
    expect(summed).toBe(fit.weightedPointsTotal);
    expect(fit.weightedPointsTotal / fit.weightTotal).toBeCloseTo(fit.compositeScore!, 10);
  });
});

describe('Given a dimension nobody got to assess', () => {
  it('When the score is worked out, Then the dimension is excluded rather than counted as zero', () => {
    // Given the same card with the staff question never asked
    const ratings = FULL_SCORES.filter((r) => r.dimension !== 'staff');
    const fit = scoreFacility(facility({ ratings }), resolveWeights(WEIGHTS));

    // Hand-computed: the staff row (2×3 = 6 points over 3 weight) is removed
    // from both totals — 34 − 6 = 28 points over 10 − 3 = 7 weight, so 4.0
    expect(fit.weightedPointsTotal).toBe(28);
    expect(fit.weightTotal).toBe(7);
    expect(fit.compositeScore).toBeCloseTo(4.0, 10);
    expect(fit.unrated).toEqual(['staff']);

    // And emphatically not 28 ÷ 10 = 2.8, which is what scoring an unassessed
    // dimension as zero would produce — marking a community down for a question
    // the family never got to ask
    expect(fit.compositeScore).not.toBeCloseTo(2.8, 2);
  });

  it('When nothing at all was assessed, Then the score is withheld rather than shown as zero', () => {
    // Given a community added but not yet scored
    const fit = scoreFacility(facility(), resolveWeights([]));

    // Then there is no composite, and the UI is told so explicitly
    expect(fit.compositeScore).toBeNull();
    expect(fit.weightTotal).toBe(0);
    expect(fit.unrated).toHaveLength(FACILITY_DIMENSIONS.length);
    expect(formatComposite(fit.compositeScore)).toBe('not enough recorded');
  });

  it('When every dimension is weighted at nothing, Then the score is withheld rather than dividing by zero', () => {
    // Given a fully scored card and a family who weighted everything at zero
    const zeroed: FacilityWeight[] = FACILITY_DIMENSIONS.map(({ dimension }) => ({
      dimension,
      weight: 0,
    }));
    const fit = scoreFacility(facility({ ratings: FULL_SCORES }), resolveWeights(zeroed));

    // Then no NaN reaches the screen
    expect(fit.compositeScore).toBeNull();
    expect(Number.isNaN(fit.weightedPointsTotal)).toBe(false);
  });
});

describe('Given several communities on one shortlist', () => {
  const shortlist: FacilityNote[] = [
    facility({ id: 'f1', label: 'Oakmont', ratings: [{ dimension: 'food', score: 2 }] }),
    facility({ id: 'f2', label: 'Brookside', ratings: [{ dimension: 'food', score: 5 }] }),
    facility({ id: 'f3', label: 'Cedar Row', ratings: [{ dimension: 'food', score: 4 }] }),
  ];

  it('When they are compared, Then they stay in the order they were entered and none is named best', () => {
    // Given a shortlist whose highest score is second
    const fits = compareFacilities(shortlist, []);

    // Then the order is the family's, not the arithmetic's
    expect(fits.map((f) => f.label)).toEqual(['Oakmont', 'Brookside', 'Cedar Row']);

    // And nothing in the result marks a winner — ranking eight subjective
    // scores would claim an authority this arithmetic has not got (spec §11.2.2)
    expect(fits).not.toHaveProperty('bestFacilityId');
    for (const fit of fits) {
      expect(Object.keys(fit)).not.toContain('rank');
      expect(Object.keys(fit)).not.toContain('isBest');
    }
  });

  it('When they are compared, Then every one is scored against the same weights', () => {
    // Given food weighted as decisive
    const fits = compareFacilities(shortlist, [{ dimension: 'food', weight: 3 }]);

    // Then each community's single scored dimension carries that same weight —
    // shared weights are what makes the scores comparable at all
    for (const fit of fits) {
      expect(fit.parts).toHaveLength(1);
      expect(fit.parts[0].weight).toBe(3);
    }
  });

  it('When the comparison table is built, Then every dimension has a row and every community a cell', () => {
    // Given the shortlist
    const rows = dimensionRows(shortlist, WEIGHTS);

    // Then the table is the chart's equivalent: complete, in display order
    expect(rows).toHaveLength(FACILITY_DIMENSIONS.length);
    expect(rows.map((r) => r.dimension)).toEqual(FACILITY_DIMENSIONS.map((d) => d.dimension));
    for (const row of rows) {
      expect(row.scores).toHaveLength(3);
      expect(row.scores.map((s) => s.facilityId)).toEqual(['f1', 'f2', 'f3']);
    }

    // And an unassessed cell is null rather than 0 — the table must not imply
    // a judgement nobody made
    const staffRow = rows.find((r) => r.dimension === 'staff')!;
    expect(staffRow.scores.every((s) => s.score === null)).toBe(true);
  });

  it('When the shortlist is capped, Then the cap is a stated number rather than an accident', () => {
    expect(MAX_FACILITIES).toBe(6);
  });
});

describe('Given a community priced against the current plan', () => {
  it('When it costs more, Then the extra monthly cost and the shortened projection are both reported', () => {
    // Given a plan running out in month 80, and a community $900 a month dearer
    // that would run it out in month 66
    const consequence = costConsequence(
      { allInMonthlyCents: 600_000, depletionMonth: 80 },
      { allInMonthlyCents: 690_000, depletionMonth: 66 },
    );

    // Then both differences are stated, signed from the community's side
    expect(consequence.monthlyDeltaCents).toBe(90_000);
    expect(consequence.runwayDeltaMonths).toBe(-14);
  });

  it('When it costs less, Then the difference is reported as a saving rather than as a negative cost', () => {
    const consequence = costConsequence(
      { allInMonthlyCents: 690_000, depletionMonth: 66 },
      { allInMonthlyCents: 600_000, depletionMonth: 80 },
    );

    expect(consequence.monthlyDeltaCents).toBe(-90_000);
    expect(consequence.runwayDeltaMonths).toBe(14);
  });

  it('When either side never runs out of money, Then no month difference is invented', () => {
    // Given a community the plan's income covers indefinitely
    const consequence = costConsequence(
      { allInMonthlyCents: 600_000, depletionMonth: 80 },
      { allInMonthlyCents: 400_000, depletionMonth: null },
    );

    // Then the months delta is withheld: subtracting a month from "never" would
    // manufacture a figure with no meaning
    expect(consequence.runwayDeltaMonths).toBeNull();
    expect(consequence.monthlyDeltaCents).toBe(-200_000);
  });
});

describe('Given a stored shortlist from an older version of this page', () => {
  it('When a facility is parsed, Then the fields added since default rather than failing', () => {
    // Given a payload written before ratings and photos existed
    const parsed = FacilityNoteSchema.parse({
      id: 'f1',
      label: 'Oakmont',
      careType: 'assisted_living',
    });

    // Then it parses, and the missing collections come back empty rather than
    // undefined — the same no-migration guarantee the IL options have
    expect(parsed.ratings).toEqual([]);
    expect(parsed.photoIds).toEqual([]);
    expect(parsed.waitlist).toBe('unknown');
  });

  it('When it names a dimension this version does not know, Then the payload is rejected at the boundary', () => {
    // Given a hand-edited rating
    const result = FacilityNoteSchema.safeParse({
      id: 'f1',
      label: 'Oakmont',
      careType: 'assisted_living',
      ratings: [{ dimension: 'parking', score: 4 }],
    });

    // Then it does not reach the engine as a silently-dropped rating
    expect(result.success).toBe(false);
  });
});
