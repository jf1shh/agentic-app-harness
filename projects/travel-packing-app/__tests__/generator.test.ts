import { describe, it, expect } from 'vitest';
import {
  COLOR_MATCHES,
  PALETTES,
  doColorsMatch,
  getThermalValue,
  generateWardrobeFromArchetype,
} from '../src/utils/generator';

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; every case was proved
// by mutation — see the PR body.

describe('doColorsMatch', () => {
  it('Given two colours listed as compatible, When they are compared, Then they match', () => {
    expect(doColorsMatch('black', 'white')).toBe(true);
    expect(doColorsMatch('navy', 'khaki')).toBe(true);
  });

  it('Given a colour compared with itself, When they are compared, Then it matches', () => {
    expect(doColorsMatch('red', 'red')).toBe(true);
    // Including a colour absent from the table entirely.
    expect(doColorsMatch('chartreuse', 'chartreuse')).toBe(true);
  });

  it('Given two colours that clash, When they are compared, Then they do not match', () => {
    expect(doColorsMatch('red', 'olive')).toBe(false);
    expect(doColorsMatch('brown', 'blue')).toBe(false);
  });

  it('Given a pair listed in only one direction, When compared either way round, Then the answer is the same', () => {
    // The table is hand-maintained and not guaranteed symmetric, so the function
    // checks both directions. Without that, outfit generation would depend on
    // which garment happened to be the "first" one.
    for (const [colour, partners] of Object.entries(COLOR_MATCHES)) {
      for (const partner of partners) {
        expect(doColorsMatch(colour, partner)).toBe(doColorsMatch(partner, colour));
      }
    }
  });

  it('Given colours in mixed case, When they are compared, Then case is ignored', () => {
    expect(doColorsMatch('BLACK', 'White')).toBe(true);
    expect(doColorsMatch('Navy', 'KHAKI')).toBe(true);
  });

  it('Given a missing colour on either side, When they are compared, Then they match rather than block an outfit', () => {
    // An uncoloured garment must not silently disappear from every outfit.
    expect(doColorsMatch('', 'black')).toBe(true);
    expect(doColorsMatch('black', '')).toBe(true);
  });
});

describe('getThermalValue', () => {
  it('Given a garment name with no recognised material or type, When it is rated, Then it gets the base warmth', () => {
    expect(getThermalValue('Plain Garment')).toBe(3);
  });

  it.each([
    ['wool', 'Wool Jumper', 7],
    ['merino', 'Merino Base Layer', 7],
    ['fleece', 'Fleece Pullover', 7],
    ['leather', 'Leather Trousers', 5],
    ['denim', 'Denim Trousers', 5],
    ['cotton', 'Cotton Trousers', 4],
    ['linen', 'Linen Trousers', 2],
    ['silk', 'Silk Trousers', 2],
  ])('Given a %s garment, When it is rated, Then the material moves it off the base warmth', (_material, name, expected) => {
    expect(getThermalValue(name)).toBe(expected);
  });

  it('Given a garment matching several material rules, When it is rated, Then only the first matching branch applies', () => {
    // The material rules are an else-if chain, so wool wins over cotton rather
    // than the two stacking. Asserted because turning the chain into separate
    // ifs would quietly inflate every mixed-fabric garment.
    expect(getThermalValue('Wool and Cotton Blend')).toBe(7);
  });

  it('Given a warm garment type, When it is rated, Then the type adds on top of the material', () => {
    // 3 base + 4 wool + 3 coat = 10.
    expect(getThermalValue('Wool Coat')).toBe(10);
    // 3 base + 1 cotton + 3 hoodie = 7.
    expect(getThermalValue('Cotton Hoodie')).toBe(7);
  });

  it('Given a summer garment type, When it is rated, Then the type subtracts', () => {
    // 3 base + 1 cotton - 1 tee = 3.
    expect(getThermalValue('Cotton Tee')).toBe(3);
    // 3 base - 1 linen - 1 shorts = 1.
    expect(getThermalValue('Linen Shorts')).toBe(1);
  });

  it('Given every combination of material and garment-type rule, When each is rated, Then the result stays within the 1..10 scale', () => {
    // Stated as a sweep rather than as "the clamp works", because the clamp
    // currently cannot fire: the modifiers top out at 3 + 4 (wool) + 3 (coat)
    // = 10 and bottom out at 3 - 1 (linen) - 1 (shorts) = 1, so removing
    // Math.max/Math.min changes no result for any input. An earlier version of
    // this case asserted the clamp and survived exactly that mutation — it was
    // restating arithmetic the rules already guarantee.
    //
    // What this sweep does protect is the guarantee the packing engine relies
    // on (warmth is comparable against a 1..10 target), so widening any single
    // modifier without adjusting the others fails here.
    const materials = ['Wool', 'Merino', 'Cashmere', 'Fleece', 'Puffer', 'Knit', 'Leather',
      'Denim', 'Corduroy', 'Cotton', 'Canvas', 'Chinos', 'Linen', 'Silk', 'Mesh', 'Gauze', ''];
    const types = ['Coat', 'Jacket', 'Sweater', 'Hoodie', 'Parka', 'Shorts', 'Tank', 'Tee',
      'T-Shirt', 'Skirt', 'Camisole', ''];

    for (const material of materials) {
      for (const type of types) {
        const value = getThermalValue(`${material} ${type}`.trim() || 'Plain');
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    }
  });

  it('Given the warmest and coolest possible garments, When they are rated, Then they land exactly on the ends of the scale', () => {
    // Pins the range's endpoints, so a modifier change that would make the
    // clamp start firing shows up here as a changed value.
    expect(getThermalValue('Wool Coat')).toBe(10);
    expect(getThermalValue('Linen Shorts')).toBe(1);
  });

  it('Given a garment name in any case, When it is rated, Then matching is case-insensitive', () => {
    expect(getThermalValue('WOOL COAT')).toBe(getThermalValue('wool coat'));
  });
});

describe('generateWardrobeFromArchetype', () => {
  it('Given a known archetype, When a wardrobe is generated, Then every garment carries a role and a derived warmth', () => {
    const garments = generateWardrobeFromArchetype('quiet-luxury', 'balanced', 4);

    expect(garments.length).toBeGreaterThan(0);
    for (const g of garments) {
      expect(g.roles.length).toBeGreaterThan(0);
      expect(g.warmth).toBeGreaterThanOrEqual(1);
      expect(g.warmth).toBeLessThanOrEqual(10);
      // Warmth must come from the garment's own name, not a constant.
      expect(g.warmth).toBe(getThermalValue(g.name));
    }
  });

  it('Given a generated wardrobe, When ids are collected, Then every garment has a unique id', () => {
    // Duplicate ids collide as React keys and break outfit scheduling.
    const garments = generateWardrobeFromArchetype('scandi', 'balanced', 6);
    const ids = garments.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Given a generated wardrobe, When roles are counted, Then it contains tops, bottoms and one topper', () => {
    const garments = generateWardrobeFromArchetype('gorpcore', 'balanced', 4);
    expect(garments.filter((g) => g.roles.includes('top')).length).toBeGreaterThan(0);
    expect(garments.filter((g) => g.roles.includes('bottom')).length).toBeGreaterThan(0);
    expect(garments.filter((g) => g.roles.includes('topper'))).toHaveLength(1);
  });

  it('Given the minimalist strategy, When it is compared with balanced for the same trip, Then it packs no more tops', () => {
    // The whole promise of the strategy: fewer garments for the same trip.
    const minimal = generateWardrobeFromArchetype('quiet-luxury', 'minimalist', 6);
    const balanced = generateWardrobeFromArchetype('quiet-luxury', 'balanced', 6);
    const tops = (gs: typeof minimal) => gs.filter((g) => g.roles.includes('top')).length;
    expect(tops(minimal)).toBeLessThanOrEqual(tops(balanced));
  });

  it.each([
    ['minimalist', 6, 2],
    ['flexible', 6, 3],
    ['balanced', 3, 3],
  ])('Given the %s strategy over %i days, When a wardrobe is generated, Then it yields the expected number of tops',
    (strategy, days, expectedTops) => {
      const garments = generateWardrobeFromArchetype('quiet-luxury', strategy as string, days as number);
      expect(garments.filter((g) => g.roles.includes('top'))).toHaveLength(expectedTops as number);
    });

  it('Given a trip longer than the palette, When a wardrobe is generated, Then it caps at the available garments instead of repeating', () => {
    // quiet-luxury has 4 tops and 3 bottoms; a 30-day trip must not emit 30 tops.
    const garments = generateWardrobeFromArchetype('quiet-luxury', 'balanced', 30);
    expect(garments.filter((g) => g.roles.includes('top'))).toHaveLength(PALETTES['quiet-luxury'].tops.length);
    expect(garments.filter((g) => g.roles.includes('bottom'))).toHaveLength(PALETTES['quiet-luxury'].bottoms.length);
  });

  it.each([0, 1])(
    'Given a trip of %i days, When a wardrobe is generated, Then at least one top and one bottom are still produced',
    (days) => {
      // Zero is the case that matters and the one an earlier version of this
      // test missed. For any positive length Math.ceil already returns >= 1, so
      // removing the Math.max(1, ...) floor changes nothing and the mutation
      // survived; at zero days the floor is the only thing standing between the
      // user and an empty wardrobe with no explanation.
      const garments = generateWardrobeFromArchetype('quiet-luxury', 'minimalist', days);
      expect(garments.filter((g) => g.roles.includes('top')).length).toBeGreaterThanOrEqual(1);
      expect(garments.filter((g) => g.roles.includes('bottom')).length).toBeGreaterThanOrEqual(1);
    });

  it('Given an archetype key that does not exist, When a wardrobe is generated, Then it falls back to quiet-luxury rather than crashing', () => {
    const fallback = generateWardrobeFromArchetype('does-not-exist', 'balanced', 4);
    const expected = generateWardrobeFromArchetype('quiet-luxury', 'balanced', 4);
    expect(fallback).toEqual(expected);
  });
});

describe('fashion archetype catalog', () => {
  // Pins the exact key set (not just "at least N archetypes") so a future
  // rename or accidental deletion is caught here rather than silently
  // falling back to quiet-luxury (which the "unknown key" test above shows
  // happens without error).
  const EXPECTED_ARCHETYPES = [
    'athleisure',
    'bohemian',
    'coastal',
    'cottagecore',
    'dark-academia',
    'gorpcore',
    'preppy',
    'quiet-luxury',
    'rock',
    'scandi',
    'streetwear',
    'whimsigoth',
  ];

  it('Given the fashion archetype catalog, When its keys are listed, Then all 12 styles are present', () => {
    expect(Object.keys(PALETTES).sort()).toEqual(EXPECTED_ARCHETYPES);
  });

  it.each(EXPECTED_ARCHETYPES)(
    'Given the %s archetype, When a wardrobe is generated, Then it yields real tops, bottoms and a topper with valid warmth',
    (archetypeKey) => {
      const garments = generateWardrobeFromArchetype(archetypeKey, 'balanced', 5);
      const tops = garments.filter((g) => g.roles.includes('top'));
      const bottoms = garments.filter((g) => g.roles.includes('bottom'));
      const toppers = garments.filter((g) => g.roles.includes('topper'));

      expect(tops.length).toBeGreaterThan(0);
      expect(bottoms.length).toBeGreaterThan(0);
      expect(toppers).toHaveLength(1);

      for (const g of garments) {
        expect(g.warmth).toBeGreaterThanOrEqual(1);
        expect(g.warmth).toBeLessThanOrEqual(10);
        expect(g.colors.length).toBeGreaterThan(0);
      }
    }
  );

  it('Given two different archetypes, When their wardrobes are generated, Then the garment names actually differ', () => {
    // Proves each new archetype carries its own ported data rather than
    // reusing quiet-luxury's palette under a different key.
    const rock = generateWardrobeFromArchetype('rock', 'balanced', 4);
    const cottagecore = generateWardrobeFromArchetype('cottagecore', 'balanced', 4);
    const rockNames = new Set(rock.map((g) => g.name));
    const cottagecoreNames = new Set(cottagecore.map((g) => g.name));
    const overlap = [...rockNames].filter((n) => cottagecoreNames.has(n));
    expect(overlap).toHaveLength(0);
  });

  it('Given the streetwear archetype, When its outerwear is generated, Then it matches the ported palette rather than a placeholder', () => {
    const garments = generateWardrobeFromArchetype('streetwear', 'balanced', 3);
    const topper = garments.find((g) => g.roles.includes('topper'));
    expect(topper?.name).toBe('Black Cropped Puffer');
  });
});
