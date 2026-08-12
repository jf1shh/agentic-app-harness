import { describe, expect, it } from 'vitest';
import {
  recommendRecipes,
  parseIngredients,
  parseEstimatedMinutes,
  estimateDifficulty,
} from './recommend';
import type { InventoryItem, RecipeEntry } from './schemas';

const pesto: RecipeEntry = {
  filename: 'classic-pesto-pasta.md',
  content: `# Classic Pesto Pasta

**Prep Time**: 15 mins | **Servings**: 4

## Ingredients
- 2 cups fresh basil leaves
- 1/2 cup extra virgin olive oil
- 1/3 cup pine nuts
- 2 cloves garlic
- 1/2 cup grated parmesan cheese
- 400g pasta

## Instructions
1. Blend everything.`,
};

const salmon: RecipeEntry = {
  filename: 'garlic-butter-salmon.md',
  content: `# Garlic Butter Salmon

**Prep Time**: 20 mins | **Cook Time**: 30 mins

## Ingredients
- 2 salmon fillets
- 3 cloves garlic, minced
- 2 tbsp butter
- 1 tbsp lemon juice
- fresh parsley
- salt
- pepper
- olive oil

## Instructions
1. Sear salmon.`,
};

const inventory: InventoryItem[] = [
  { id: '1', name: 'Fresh Basil', category: 'Herbs', addedAt: 'x' },
  { id: '2', name: 'Garlic Cloves', category: 'Produce', addedAt: 'x' },
  { id: '3', name: 'Pine Nuts', category: 'Pantry', addedAt: 'x' },
  { id: '4', name: 'Parmesan Cheese', category: 'Dairy', addedAt: 'x' },
];

describe('recipe recommendation engine', () => {
  it('parses ingredient bullets out of a recipe markdown body', () => {
    // Given a recipe markdown with an Ingredients section
    // When the ingredients are parsed
    const ings = parseIngredients(pesto.content);
    // Then every bullet is returned and nothing from other sections leaks in
    expect(ings).toHaveLength(6);
    expect(ings.some((i) => i.includes('basil'))).toBe(true);
    expect(ings.some((i) => i.toLowerCase().includes('blend'))).toBe(false);
  });

  it('sums prep and cook time from the markdown', () => {
    // Given a recipe declaring both prep (20) and cook (30) time
    // When the estimated time is parsed
    // Then the two are summed
    expect(parseEstimatedMinutes(salmon.content)).toBe(50);
    expect(parseEstimatedMinutes(pesto.content)).toBe(15);
  });

  it('estimates difficulty from ingredient count and time', () => {
    // Given recipes of varying size/time
    // Then difficulty scales accordingly
    expect(estimateDifficulty(3, 15)).toBe('Easy');
    expect(estimateDifficulty(8, 20)).toBe('Medium'); // many ingredients
    expect(estimateDifficulty(9, 60)).toBe('Hard'); // many AND long
  });

  it('ranks recipes the pantry covers best, highest match first', () => {
    // Given a pantry stocked for pesto but not salmon
    // When recommendations are computed
    const recs = recommendRecipes(inventory, [salmon, pesto]);
    // Then pesto (4 matches) outranks salmon (garlic only)
    expect(recs[0].filename).toBe('classic-pesto-pasta.md');
    expect(recs[0].matchCount).toBeGreaterThan(recs[1].matchCount);
    expect(recs[0].difficulty).toBe('Easy');
  });

  it('omits recipes with no matching ingredients', () => {
    // Given a pantry that shares nothing with the recipe
    const barren: InventoryItem[] = [{ id: '9', name: 'Chocolate', category: 'Pantry', addedAt: 'x' }];
    // When recommendations are computed
    const recs = recommendRecipes(barren, [pesto, salmon]);
    // Then a recipe you cannot cook toward is not recommended
    expect(recs).toHaveLength(0);
  });

  // Mutation testing (node scripts/run-mutation.mjs smart-recipe-app --mutate
  // "src/lib/recommend.ts") found this file at 48.5%. The cases below target
  // branches that were entirely NoCoverage -- never executed by any fixture
  // above -- plus a few weakly-asserted ones.

  it('Given markdown with no "## Ingredients" heading at all, When ingredients are parsed, Then an empty list is returned rather than throwing or scanning the whole document', () => {
    const noHeading = '# Just a Title\n\nSome prose with no structured sections.';
    expect(parseIngredients(noHeading)).toEqual([]);
  });

  it('Given markdown with no Prep/Cook/Total Time label, When the estimated time is parsed, Then it falls back to any bare "N min" mention', () => {
    const noLabels = '# Quick Snack\n\nReady in about 5 min, no fuss.';
    expect(parseEstimatedMinutes(noLabels)).toBe(5);
  });

  it('Given markdown with no time information at all, When the estimated time is parsed, Then it returns null rather than zero', () => {
    const noTime = '# Mystery Dish\n\n## Ingredients\n- something';
    expect(parseEstimatedMinutes(noTime)).toBeNull();
  });

  it('Given a recipe with no "# Title" heading, When recommended, Then its title falls back to the filename with separators turned into spaces', () => {
    const untitled: RecipeEntry = {
      filename: 'weeknight-garlic-noodles.md',
      content: '## Ingredients\n- garlic\n- noodles',
    };
    const recs = recommendRecipes(
      [{ id: '1', name: 'Garlic', category: 'Produce', addedAt: 'x' }],
      [untitled],
    );
    expect(recs[0].title).toBe('weeknight garlic noodles');
  });

  it('Given two recipes tied on match count, When ranked, Then the quicker recipe (by estimated minutes) is ranked first', () => {
    const slow: RecipeEntry = {
      filename: 'slow-garlic-bread.md',
      content: '# Slow Garlic Bread\n\n**Prep Time**: 45 mins\n\n## Ingredients\n- garlic',
    };
    const quick: RecipeEntry = {
      filename: 'quick-garlic-bread.md',
      content: '# Quick Garlic Bread\n\n**Prep Time**: 5 mins\n\n## Ingredients\n- garlic',
    };
    const recs = recommendRecipes(
      [{ id: '1', name: 'Garlic', category: 'Produce', addedAt: 'x' }],
      [slow, quick],
    );
    expect(recs.map((r) => r.filename)).toEqual(['quick-garlic-bread.md', 'slow-garlic-bread.md']);
  });

  it('Given two recipes tied on match count and estimated minutes, When ranked, Then they are ordered alphabetically by title for a stable result', () => {
    const zebra: RecipeEntry = {
      filename: 'zebra-garlic-dish.md',
      content: '# Zebra Garlic Dish\n\n**Prep Time**: 10 mins\n\n## Ingredients\n- garlic',
    };
    const apple: RecipeEntry = {
      filename: 'apple-garlic-dish.md',
      content: '# Apple Garlic Dish\n\n**Prep Time**: 10 mins\n\n## Ingredients\n- garlic',
    };
    const recs = recommendRecipes(
      [{ id: '1', name: 'Garlic', category: 'Produce', addedAt: 'x' }],
      [zebra, apple],
    );
    expect(recs.map((r) => r.title)).toEqual(['Apple Garlic Dish', 'Zebra Garlic Dish']);
  });

  it('Given a recipe where the pantry covers 2 of 4 ingredients, When recommended, Then the match ratio is exactly one half', () => {
    const four: RecipeEntry = {
      filename: 'four-ingredient-dish.md',
      content: '# Four Ingredient Dish\n\n## Ingredients\n- garlic\n- basil\n- salmon\n- pine nuts',
    };
    const recs = recommendRecipes(
      [
        { id: '1', name: 'Garlic', category: 'Produce', addedAt: 'x' },
        { id: '2', name: 'Basil', category: 'Herbs', addedAt: 'x' },
      ],
      [four],
    );
    expect(recs[0].matchCount).toBe(2);
    expect(recs[0].totalIngredients).toBe(4);
    expect(recs[0].matchRatio).toBe(0.5);
  });

  it('Given few ingredients but a long cook time, When difficulty is estimated, Then it is Medium rather than Easy purely because of the time', () => {
    expect(estimateDifficulty(3, 45)).toBe('Medium');
  });

  it('Given a stopword like "olive" and a short word under 3 characters, When tokenized via matching, Then neither drives a match on its own', () => {
    // "olive oil" in the pantry should not match a recipe ingredient that
    // merely mentions "oil" or "olive" without a real shared food-word token
    // (both are filtered: "oil" is a stopword-adjacent short/common term, and
    // ingredient tokens under 3 characters are dropped entirely).
    const oat: RecipeEntry = {
      filename: 'oat-dish.md',
      content: '# Oat Dish\n\n## Ingredients\n- oats',
    };
    const recs = recommendRecipes(
      [{ id: '1', name: 'Olive Oil', category: 'Pantry', addedAt: 'x' }],
      [oat],
    );
    expect(recs).toHaveLength(0);
  });
});
