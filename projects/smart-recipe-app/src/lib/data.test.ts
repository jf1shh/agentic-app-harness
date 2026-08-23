import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readInventory, readMealPlan, readRecipes, writeInventory, writeMealPlan, writeRecipe } from './data';

// Every read function here shares one boundary: parseStored() validates
// untrusted localStorage JSON against a Zod schema and falls back to seed
// data on anything that doesn't match. These tests exercise that boundary
// directly, not just the schemas it delegates to — a prior version of this
// file imported only ./schemas and never touched ./data at all, so every
// branch below (corrupted JSON, a non-array payload, a denied storage read,
// the update-vs-insert split in writeRecipe) was unverified despite the
// harness's filename-based sensor crediting this module as tested.

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readInventory', () => {
  it('Given empty storage, When read, Then it returns the seeded inventory', () => {
    const inventory = readInventory();
    expect(inventory).toHaveLength(5);
    expect(inventory.map((i) => i.id)).toContain('inv-1');
  });

  it('Given a validly-stored inventory, When read, Then it returns exactly what was stored', () => {
    const stored = [{ id: 'x', name: 'Custom Item', category: 'Pantry', addedAt: '2026-01-01T00:00:00.000Z' }];
    localStorage.setItem('smart_recipe_inventory', JSON.stringify(stored));
    expect(readInventory()).toEqual(stored);
  });

  it('Given corrupted (non-JSON) storage, When read, Then it falls back to the seeded inventory rather than throwing', () => {
    localStorage.setItem('smart_recipe_inventory', '{not valid json');
    expect(() => readInventory()).not.toThrow();
    expect(readInventory()).toHaveLength(5);
  });

  it('Given a stored payload that is not an array, When read, Then it falls back to the seeded inventory', () => {
    localStorage.setItem('smart_recipe_inventory', JSON.stringify({ not: 'an array' }));
    expect(readInventory()).toHaveLength(5);
  });

  it('Given storage access throws (e.g. a denied/private-mode read), When read, Then it falls back to the seeded inventory rather than propagating', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => readInventory()).not.toThrow();
    expect(readInventory()).toHaveLength(5);
  });
});

describe('writeInventory', () => {
  it('Given a new inventory list, When written, Then a subsequent read returns it', () => {
    const inventory = [{ id: 'a', name: 'Eggs', category: 'Dairy', addedAt: '2026-01-01T00:00:00.000Z' }];
    writeInventory(inventory);
    expect(readInventory()).toEqual(inventory);
  });

  it('Given storage rejects the write (e.g. quota exceeded), When written, Then it does not throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeInventory([])).not.toThrow();
  });
});

describe('readMealPlan / writeMealPlan', () => {
  it('Given empty storage, When read, Then it returns the seeded meal plan', () => {
    expect(readMealPlan()).toHaveLength(1);
  });

  it('Given corrupted storage, When read, Then it falls back to the seeded meal plan', () => {
    localStorage.setItem('smart_recipe_meal_plan', 'not json at all');
    expect(readMealPlan()).toHaveLength(1);
  });

  it('Given a new meal plan, When written, Then a subsequent read returns it', () => {
    const plan = [{ id: 'mp-2', date: '2026-02-01', recipeId: 'garlic-butter-salmon.md', mealType: 'Lunch' }];
    writeMealPlan(plan);
    expect(readMealPlan()).toEqual(plan);
  });
});

describe('readRecipes', () => {
  it('Given empty storage, When read, Then it returns the seeded recipes', () => {
    expect(readRecipes().map((r) => r.filename)).toEqual(['classic-pesto-pasta.md', 'garlic-butter-salmon.md']);
  });

  it('Given corrupted storage, When read, Then it falls back to the seeded recipes', () => {
    localStorage.setItem('smart_recipe_recipes', '{{{');
    expect(readRecipes()).toHaveLength(2);
  });
});

describe('writeRecipe', () => {
  it('Given a filename that already exists, When written, Then it updates that entry in place rather than duplicating it', () => {
    writeRecipe('classic-pesto-pasta.md', '# Replaced content');
    const recipes = readRecipes();
    expect(recipes).toHaveLength(2);
    expect(recipes.find((r) => r.filename === 'classic-pesto-pasta.md')?.content).toBe('# Replaced content');
  });

  it('Given a filename that does not exist yet, When written, Then it is appended as a new entry', () => {
    writeRecipe('new-recipe.md', '# Brand New Recipe');
    const recipes = readRecipes();
    expect(recipes).toHaveLength(3);
    expect(recipes.find((r) => r.filename === 'new-recipe.md')?.content).toBe('# Brand New Recipe');
  });

  it('Given storage rejects the write, When written, Then it does not throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeRecipe('x.md', 'content')).not.toThrow();
  });
});
