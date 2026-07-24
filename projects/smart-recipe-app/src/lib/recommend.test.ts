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
});
