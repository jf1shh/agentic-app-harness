/**
 * Unit tests for the dollar-basis labels (spec §11.9).
 *
 * The point of this module is that ONE definition feeds both the chart label
 * and the §6.10 derivation `assumptions` array. A chart labelled from one
 * string and a derivation labelled from another is precisely the drift the §6
 * "Explain the Arithmetic Without Re-implementing It" lesson forbids, so the
 * correspondence is asserted here rather than assumed.
 *
 * The substantive assertion is that the two bases are not interchangeable:
 * the runway and IL series compound an escalator and are therefore in the
 * dollars of each future month, while the break-even snapshot is in today's.
 * Labelling the former "today's dollars" — which the spec's original title
 * asked for — would be a confident false statement on the chart that most
 * needs an accurate one.
 */
import { describe, it, expect } from 'vitest';
import {
  DOLLAR_BASIS_LABEL,
  DOLLAR_BASIS_ASSUMPTION,
  basisForExplanation,
  type DollarBasis,
} from './dollarBasis';

describe('Given the two dollar bases the app draws figures in', () => {
  it('When the nominal label is read, Then it names future dollars and never claims today’s dollars', () => {
    const label = DOLLAR_BASIS_LABEL.nominal;
    expect(label).toMatch(/future dollars/i);
    // The original spec wording. Printing it here would be false.
    expect(label).not.toMatch(/in today’s dollars|in today's dollars/i);
  });

  it('When the today label is read, Then it names today’s dollars and states that no inflation is applied', () => {
    const label = DOLLAR_BASIS_LABEL.today;
    expect(label).toMatch(/today’s dollars|today's dollars/i);
    expect(label).toMatch(/no inflation/i);
  });

  it('When the two labels are compared, Then they are distinct strings', () => {
    expect(DOLLAR_BASIS_LABEL.nominal).not.toBe(DOLLAR_BASIS_LABEL.today);
  });

  it('When the nominal assumption is read, Then it names both growth rates the projection compounds', () => {
    // §11.9: "with growth rates surfaced". A reader who does not know the line
    // already incorporates inflation is the failure mode this closes.
    const assumption = DOLLAR_BASIS_ASSUMPTION.nominal;
    expect(assumption).toMatch(/escalator/i);
    expect(assumption).toMatch(/cost-of-living|COLA/i);
  });

  it('When the today assumption is read, Then it states the comparison is a single month at current rates', () => {
    const assumption = DOLLAR_BASIS_ASSUMPTION.today;
    expect(assumption).toMatch(/single month|one month/i);
    expect(assumption).toMatch(/no inflation/i);
  });

  it('When every basis is enumerated, Then each one has both a label and an assumption', () => {
    const bases: DollarBasis[] = ['nominal', 'today'];
    for (const basis of bases) {
      expect(DOLLAR_BASIS_LABEL[basis], `${basis} label missing`).toBeTruthy();
      expect(DOLLAR_BASIS_ASSUMPTION[basis], `${basis} assumption missing`).toBeTruthy();
    }
  });
});

describe('Given a derivation that reports a figure', () => {
  it('When the runway derivation asks for its basis, Then it is nominal, because the runway compounds an escalator', () => {
    expect(basisForExplanation('runway')).toBe('nominal');
  });

  it('When the sensitivity derivation asks for its basis, Then it is nominal, because it sweeps rates over the same projection', () => {
    expect(basisForExplanation('sensitivity')).toBe('nominal');
  });

  it('When the break-even derivation asks for its basis, Then it is today, because breakeven.ts has no time dimension', () => {
    expect(basisForExplanation('break-even')).toBe('today');
  });

  it('When a derivation that reports no projected figure asks for its basis, Then it is today rather than nominal', () => {
    // A single-month cost is not an inflated figure. Defaulting these to
    // nominal would attach an escalator claim to a number that has none.
    expect(basisForExplanation('first-month')).toBe('today');
    expect(basisForExplanation('all-in')).toBe('today');
  });
});
