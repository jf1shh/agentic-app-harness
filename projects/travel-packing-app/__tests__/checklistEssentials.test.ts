import { describe, it, expect } from 'vitest';
import { buildEssentialSpecs, computeProgressPercent } from '../src/utils/checklistEssentials';

describe('buildEssentialSpecs', () => {
  it('Given a trip duration and no resolved plug type, When specs are built, Then five essentials are returned with a universal-adapter spec', () => {
    const specs = buildEssentialSpecs(5, null);
    expect(specs.map((s) => s.id)).toEqual([
      'essential-underwear',
      'essential-socks',
      'essential-toiletries',
      'essential-tech',
      'essential-adapter',
    ]);
    expect(specs.find((s) => s.id === 'essential-underwear')?.params).toEqual({ n: 5 });
    expect(specs.find((s) => s.id === 'essential-socks')?.params).toEqual({ n: 5 });
    expect(specs.find((s) => s.id === 'essential-adapter')?.key).toBe('checklist.universalAdapter');
  });

  it('Given a resolved destination plug type, When specs are built, Then the adapter spec carries the plug type', () => {
    const specs = buildEssentialSpecs(3, 'C/F');
    const adapter = specs.find((s) => s.id === 'essential-adapter');
    expect(adapter?.key).toBe('checklist.travelAdapterFor');
    expect(adapter?.params).toEqual({ type: 'C/F' });
  });

  it('Given no travel mode argument, When specs are built, Then it defaults to flying and adds no road-trip essentials', () => {
    const specs = buildEssentialSpecs(5, null);
    expect(specs.some((s) => s.id === 'essential-car-charger')).toBe(false);
    expect(specs.some((s) => s.id === 'essential-road-kit')).toBe(false);
  });

  it('Given travel mode is driving, When specs are built, Then a car charger and emergency road kit are appended', () => {
    const specs = buildEssentialSpecs(5, null, 'driving');
    expect(specs.map((s) => s.id)).toEqual([
      'essential-underwear',
      'essential-socks',
      'essential-toiletries',
      'essential-tech',
      'essential-adapter',
      'essential-car-charger',
      'essential-road-kit',
    ]);
  });

  it.each(['flying', 'train', 'biking'] as const)('Given travel mode is %s, When specs are built, Then no road-trip essentials are added', (mode) => {
    const specs = buildEssentialSpecs(5, null, mode);
    expect(specs.some((s) => s.id === 'essential-car-charger')).toBe(false);
    expect(specs.some((s) => s.id === 'essential-road-kit')).toBe(false);
  });
});

describe('computeProgressPercent', () => {
  it('Given 5 of 10 items checked, When progress is computed, Then it reports 50%', () => {
    expect(computeProgressPercent(5, 10)).toBe(50);
  });

  it('Given zero total items, When progress is computed, Then it reports 0% rather than dividing by zero', () => {
    expect(computeProgressPercent(0, 0)).toBe(0);
  });

  it('Given a fractional ratio, When progress is computed, Then it rounds to the nearest whole percent', () => {
    expect(computeProgressPercent(1, 3)).toBe(33);
  });
});
