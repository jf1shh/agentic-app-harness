import { describe, it, expect } from 'vitest';
import { Garment } from '../src/types';

// KNOWN GAP — this file does not currently test application behaviour.
//
// It imports only a *type*, then rebuilds the essentials list and the progress
// formula inside the test body and asserts against its own arithmetic. Nothing
// here can go red in response to a change to the app: the real essentials list
// lives inline in src/components/PackingChecklist.tsx (see the `essential-*`
// ids around line 46), so renaming an essential there, changing how many there
// are, or altering the percentage rounding all leave these assertions green.
//
// This is the §9.4 defect class in a shape the `no-op-assertion` guardrail
// cannot see — the assertions have real matchers, but their subject is a local
// variable rather than anything the application exports. The fix is to extract
// the essentials builder and the progress calculation out of the component into
// a logic module and point these tests at it; that is a structural change to
// the app and is deliberately left for its own change set rather than smuggled
// into a BDD-formatting sweep. Until then, treat this file's green as saying
// nothing about the checklist.

describe('packingChecklist logic', () => {
  const sampleGarments: Garment[] = [
    { id: 'g1', name: 'Navy Chinos', category: 'pants', roles: ['bottom'], colors: ['navy'], warmth: 5, exclusionTags: [], weightGrams: 500, volumeCm3: 2000 },
    { id: 'g2', name: 'White Linen Shirt', category: 'shirt', roles: ['top'], colors: ['white'], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 800 },
  ];

  it('Given a 5-day trip and two packed garments, When the checklist total is computed, Then it counts garments plus the four per-trip essentials', () => {
    const tripDays = 5;
    const essentials = [
      { id: 'essential-underwear', name: `${tripDays}x Pairs of Underwear` },
      { id: 'essential-socks', name: `${tripDays}x Pairs of Socks` },
      { id: 'essential-toiletries', name: '1x Toiletry Kit' },
      { id: 'essential-tech', name: '1x Tech Pouch / Chargers' },
    ];

    const totalCount = sampleGarments.length + essentials.length;
    expect(totalCount).toBe(6);
    expect(essentials[0].name).toBe('5x Pairs of Underwear');
  });

  it('Given 5 of 10 checklist items ticked, When progress is computed, Then it reports 50%', () => {
    const totalItems = 10;
    const checkedCount = 5;
    const percent = Math.round((checkedCount / totalItems) * 100);
    expect(percent).toBe(50);
  });
});
