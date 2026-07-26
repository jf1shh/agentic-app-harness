/**
 * Unit tests for the form-state to Plan bridge.
 *
 * This is where UI convenience meets the validated contract, so the important
 * property is that whatever the form produces is always a valid Plan.
 */
import { describe, it, expect } from 'vitest';
import {
  INITIAL_STATE,
  buildPlan,
  primaryScenario,
  breakEvenScenarios,
  makeContributors,
  US_STATES,
} from './plannerState';
import { PlanSchema } from './schemas';

describe('Given the initial triage state', () => {
  it('When a plan is built, Then it satisfies the Plan contract', () => {
    expect(PlanSchema.safeParse(buildPlan(INITIAL_STATE)).success).toBe(true);
  });

  it('When states are listed, Then all 50 states and DC are offered', () => {
    expect(US_STATES).toHaveLength(51);
  });
});

describe('Given a residential care type', () => {
  it('When the scenario is built, Then facility fees are attached and housing carry is not', () => {
    const scenario = primaryScenario({ ...INITIAL_STATE, careType: 'assisted_living' });
    expect(scenario.fees).toBeDefined();
    expect(scenario.housingCarry).toBeUndefined();
  });
});

describe('Given an hourly in-home care type', () => {
  it('When the scenario is built, Then hours carry through and fees do not apply', () => {
    const scenario = primaryScenario({
      ...INITIAL_STATE,
      careType: 'in_home_health_aide',
      hoursPerWeek: 30,
    });
    expect(scenario.hoursPerWeek).toBe(30);
    expect(scenario.fees).toBeUndefined();
  });
});

describe('Given add-on services are toggled on', () => {
  it('When the scenario is built, Then only the enabled ones are billed', () => {
    const scenario = primaryScenario({
      ...INITIAL_STATE,
      addOns: INITIAL_STATE.addOns.map((a, i) => ({ ...a, enabled: i === 0 })),
    });
    expect(scenario.fees?.addOns).toHaveLength(1);
    expect(scenario.fees?.addOns[0].id).toBe('medication_management');
  });
});

describe('Given the break-even comparison', () => {
  it('When built, Then both sides exist and the residential side is residential', () => {
    const { inHome, residential } = breakEvenScenarios(INITIAL_STATE);
    expect(inHome.careType).toBe('in_home_health_aide');
    expect(residential.careType).toBe('assisted_living');
  });

  it('When the plan is for in-home care, Then assisted living is used as the comparison', () => {
    const { residential } = breakEvenScenarios({
      ...INITIAL_STATE,
      careType: 'in_home_health_aide',
    });
    expect(residential.careType).toBe('assisted_living');
  });
});

describe('Given the number of contributors changes', () => {
  it('When it grows, Then existing entries are preserved and new ones added', () => {
    const two = makeContributors(2);
    const edited = [{ ...two[0], name: 'Jo' }, two[1]];
    const three = makeContributors(3, edited);
    expect(three).toHaveLength(3);
    expect(three[0].name).toBe('Jo');
  });

  it('When it shrinks, Then the extra entries are dropped', () => {
    expect(makeContributors(1, makeContributors(3))).toHaveLength(1);
  });

  it('When it is zero, Then no contributors exist and the plan is still valid', () => {
    const plan = buildPlan({ ...INITIAL_STATE, contributorCount: 0, contributors: [] });
    expect(plan.contributors).toEqual([]);
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('Given a quoted price is entered', () => {
  it('When the plan is built, Then the override replaces the published median', () => {
    const scenario = primaryScenario({ ...INITIAL_STATE, costOverrideCents: 725_000 });
    expect(scenario.costOverrideCents).toBe(725_000);
  });

  it('When the quote is cleared, Then no override is set', () => {
    const scenario = primaryScenario({ ...INITIAL_STATE, costOverrideCents: null });
    expect(scenario.costOverrideCents).toBeUndefined();
  });
});
