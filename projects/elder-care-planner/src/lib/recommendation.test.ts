/**
 * Unit tests for recommendation copy.
 *
 * The neutral-voice rule (spec §5.4) is a real product constraint, not a style
 * preference: when the app states the split, it is not the sister stating it.
 * Testing it mechanically is what stops it eroding one edit at a time.
 */
import { describe, it, expect } from 'vitest';
import { buildRecommendation } from './recommendation';
import { computeScenario } from './engine/plan';
import { computeSplit } from './engine/split';
import { computeBreakEven } from './engine/breakeven';
import { DEFAULT_ASSUMPTIONS, type Plan, type CareScenario } from './schemas';

const scenario: CareScenario = {
  id: 'primary',
  label: 'Current plan',
  careType: 'assisted_living',
  stateCode: 'TX',
  fees: {
    communityFeeCents: 400_000,
    careLevelTierCents: 150_000,
    annualEscalatorRate: 0.04,
    addOns: [],
  },
  ancillary: [],
};

const plan: Plan = {
  schemaVersion: 1,
  careRecipientLabel: 'Mom',
  scenarios: [scenario],
  activeScenarioId: 'primary',
  income: [
    {
      id: 'i1',
      label: 'Income',
      kind: 'social_security',
      monthlyCents: 250_000,
      colaRate: 0.02,
      eliminationPeriodDays: 0,
    },
  ],
  assets: [
    {
      id: 'a1',
      label: 'Savings',
      kind: 'cash',
      balanceCents: 30_000_000,
      annualReturnRate: 0.04,
      liquid: true,
    },
  ],
  contributors: [],
  ledger: [],
  caregiverImpacts: [],
  assumptions: DEFAULT_ASSUMPTIONS,
  updatedAt: '2026-07-26T00:00:00.000Z',
};

const result = computeScenario(plan, scenario);
const breakEven = computeBreakEven({
  hourlyRateCents: 3_500,
  currentHoursPerWeek: 40,
  housingCarryMonthlyCents: 0,
  inHomeAncillaryMonthlyCents: 0,
  residentialAllInMonthlyCents: 770_000,
});

function allText(rec: ReturnType<typeof buildRecommendation>): string {
  return [rec.headline, rec.runwayLine, rec.topDriverLine ?? '', rec.nextAction, ...rec.warnings].join(
    ' ',
  );
}

describe('Given a plan with a shortfall', () => {
  const rec = buildRecommendation(result, breakEven, null, 'Mom');

  it('When the recommendation is built, Then it names the care recipient, not the reader', () => {
    expect(rec.headline).toContain('Mom');
  });

  it('When written, Then the second person never appears anywhere in the copy', () => {
    // No "you", "your", "yours" as whole words, in any casing.
    expect(allText(rec)).not.toMatch(/\byou(r|rs)?\b/i);
  });

  it('When a top driver exists, Then the recommendation names it', () => {
    expect(rec.topDriverLine).not.toBeNull();
    expect(rec.topDriverLine).toContain('moves this range most');
  });

  it('When fees push the cost above the brochure rate, Then the gap is stated plainly', () => {
    expect(rec.warnings.join(' ')).toContain('advertised rate');
  });

  it('When one-time costs exist, Then month one is called out separately', () => {
    expect(rec.warnings.join(' ')).toContain('Month one');
  });

  it('When a range is available, Then the runway is expressed as a range, not a single number', () => {
    expect(rec.runwayLine).toMatch(/roughly/);
  });
});

describe('Given a care recipient with no label supplied', () => {
  it('When the recommendation is built, Then a neutral fallback is used', () => {
    const rec = buildRecommendation(result, breakEven, null, '   ');
    expect(rec.headline).toContain('the care recipient');
  });
});

describe('Given contributions that exceed what a family member can afford', () => {
  it('When warned, Then the copy describes the amount, never the person', () => {
    const split = computeSplit({
      shortfallCents: 400_000,
      contributors: [
        { id: 'c1', name: 'A', monthlyCapacityCents: 1_000, providesUnpaidHoursPerWeek: 0, ownsTasks: [] },
      ],
      method: 'equal',
      aideHourlyRateCents: 3_500,
    });
    const rec = buildRecommendation(result, breakEven, split, 'Mom');
    const warning = rec.warnings.find((w) => w.includes('affordable'));
    expect(warning).toBeDefined();
    // No blame, no naming: the share is too large, the person is not at fault.
    expect(warning).not.toMatch(/\bA\b/);
    expect(warning).toContain('share is larger');
  });
});

describe('Given income that covers the cost of care', () => {
  it('When there is no depletion, Then the copy says so instead of showing a runway', () => {
    const funded: Plan = {
      ...plan,
      income: [{ ...plan.income[0], monthlyCents: 2_000_000 }],
    };
    const rec = buildRecommendation(
      computeScenario(funded, scenario),
      breakEven,
      null,
      'Mom',
    );
    expect(rec.runwayLine).toContain('not projected to run out');
  });
});
