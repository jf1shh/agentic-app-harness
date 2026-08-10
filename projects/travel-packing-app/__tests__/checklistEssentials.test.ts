import { describe, it, expect } from 'vitest';
import { buildEssentialSpecs, computeProgressPercent } from '../src/utils/checklistEssentials';

describe('buildEssentialSpecs', () => {
  it('Given a trip duration and no resolved plug type, When specs are built, Then five essentials are returned with a universal-adapter spec', () => {
    const specs = buildEssentialSpecs(5, [null]);
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
    const specs = buildEssentialSpecs(3, ['C/F']);
    const adapter = specs.find((s) => s.id === 'essential-adapter');
    expect(adapter?.key).toBe('checklist.travelAdapterFor');
    expect(adapter?.params).toEqual({ type: 'C/F' });
  });

  it('Given an empty plug-type list, When specs are built, Then it falls back to a single universal-adapter spec rather than dropping the adapter essential', () => {
    const specs = buildEssentialSpecs(5, []);
    expect(specs.filter((s) => s.id.startsWith('essential-adapter'))).toEqual([
      { id: 'essential-adapter', key: 'checklist.universalAdapter' },
    ]);
  });

  it('Given multiple legs resolving to different plug types, When specs are built, Then one adapter spec is produced per unique type', () => {
    const specs = buildEssentialSpecs(6, ['C/F', 'G', 'C/F']);
    const adapters = specs.filter((s) => s.id.startsWith('essential-adapter'));
    expect(adapters).toEqual([
      { id: 'essential-adapter', key: 'checklist.travelAdapterFor', params: { type: 'C/F' } },
      { id: 'essential-adapter-G', key: 'checklist.travelAdapterFor', params: { type: 'G' } },
    ]);
  });

  it('Given multiple legs where one plug type is unresolved, When specs are built, Then the resolved adapters are joined by one universal fallback for the unresolved leg', () => {
    const specs = buildEssentialSpecs(6, ['C/F', null]);
    const adapters = specs.filter((s) => s.id.startsWith('essential-adapter'));
    expect(adapters).toEqual([
      { id: 'essential-adapter', key: 'checklist.travelAdapterFor', params: { type: 'C/F' } },
      { id: 'essential-adapter-universal', key: 'checklist.universalAdapter' },
    ]);
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
