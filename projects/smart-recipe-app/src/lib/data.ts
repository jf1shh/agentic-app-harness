import { InventoryItem, MealPlanEntry, RecipeEntry } from './types';
import { InventorySchema, MealPlanSchema, RecipesSchema } from './schemas';
import type { z } from 'zod';

// Validate untrusted JSON read from localStorage against the contract-first
// schemas. Anything that doesn't match (corrupted storage, an older data shape,
// a tampered value) is rejected and the caller falls back to seed data instead
// of letting a malformed object flow into the UI.
function parseStored<T>(raw: string | null, schema: z.ZodType<T>, fallback: T): T {
  if (!raw) return fallback;
  const result = schema.safeParse(JSON.parse(raw));
  return result.success ? result.data : fallback;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'Fresh Basil', category: 'Herbs', quantity: '1 bunch', addedAt: new Date().toISOString() },
  { id: 'inv-2', name: 'Garlic Cloves', category: 'Produce', quantity: '1 head', addedAt: new Date().toISOString() },
  { id: 'inv-3', name: 'Extra Virgin Olive Oil', category: 'Pantry', quantity: '500 ml', addedAt: new Date().toISOString() },
  { id: 'inv-4', name: 'Parmesan Cheese', category: 'Dairy', quantity: '200 g', addedAt: new Date().toISOString() },
  { id: 'inv-5', name: 'Pine Nuts', category: 'Pantry', quantity: '100 g', addedAt: new Date().toISOString() },
];

const INITIAL_RECIPES: RecipeEntry[] = [
  {
    filename: 'classic-pesto-pasta.md',
    content: `# Classic Pesto Pasta\n\n**Prep Time**: 15 mins | **Servings**: 4\n\n## Ingredients\n- 2 cups fresh basil leaves\n- 1/2 cup extra virgin olive oil\n- 1/3 cup pine nuts\n- 2 cloves garlic\n- 1/2 cup grated parmesan cheese\n- 400g pasta\n\n## Instructions\n1. Boil pasta in salted water until al dente.\n2. Blend basil, pine nuts, and garlic in food processor.\n3. Drizzle in olive oil while blending.\n4. Stir in grated parmesan cheese.\n5. Toss hot pasta with fresh pesto sauce.`
  },
  {
    filename: 'garlic-butter-salmon.md',
    content: `# Garlic Butter Salmon\n\n**Prep Time**: 20 mins | **Servings**: 2\n\n## Ingredients\n- 2 salmon fillets\n- 3 cloves garlic, minced\n- 2 tbsp butter\n- 1 tbsp lemon juice\n- Fresh parsley\n\n## Instructions\n1. Season salmon fillets with salt and pepper.\n2. Sear in hot pan with olive oil for 4 minutes per side.\n3. Melt butter with minced garlic and lemon juice.\n4. Pour garlic butter over salmon and garnish with fresh parsley.`
  }
];

const INITIAL_MEAL_PLAN: MealPlanEntry[] = [
  { id: 'mp-1', date: new Date().toISOString().slice(0, 10), recipeId: 'classic-pesto-pasta.md', mealType: 'Dinner' }
];

export function readInventory(): InventoryItem[] {
  if (typeof window === 'undefined') return INITIAL_INVENTORY;
  try {
    return parseStored(localStorage.getItem('smart_recipe_inventory'), InventorySchema, INITIAL_INVENTORY);
  } catch {
    return INITIAL_INVENTORY;
  }
}

export function writeInventory(inventory: InventoryItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('smart_recipe_inventory', JSON.stringify(inventory));
  } catch (e) {
    console.error(e);
  }
}

export function readMealPlan(): MealPlanEntry[] {
  if (typeof window === 'undefined') return INITIAL_MEAL_PLAN;
  try {
    return parseStored(localStorage.getItem('smart_recipe_meal_plan'), MealPlanSchema, INITIAL_MEAL_PLAN);
  } catch {
    return INITIAL_MEAL_PLAN;
  }
}

export function writeMealPlan(mealPlan: MealPlanEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('smart_recipe_meal_plan', JSON.stringify(mealPlan));
  } catch (e) {
    console.error(e);
  }
}

export function readRecipes(): RecipeEntry[] {
  if (typeof window === 'undefined') return INITIAL_RECIPES;
  try {
    return parseStored(localStorage.getItem('smart_recipe_recipes'), RecipesSchema, INITIAL_RECIPES);
  } catch {
    return INITIAL_RECIPES;
  }
}

export function writeRecipe(filename: string, content: string) {
  if (typeof window === 'undefined') return;
  try {
    const recipes = readRecipes();
    const existingIdx = recipes.findIndex(r => r.filename === filename);
    if (existingIdx >= 0) {
      recipes[existingIdx].content = content;
    } else {
      recipes.push({ filename, content });
    }
    localStorage.setItem('smart_recipe_recipes', JSON.stringify(recipes));
  } catch (e) {
    console.error(e);
  }
}
