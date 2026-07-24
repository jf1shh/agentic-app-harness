// Recipe recommendation engine (pure, dependency-free logic).
//
// Recipes are stored as markdown blobs (RecipeEntry.content), so recommending
// against the pantry means parsing each recipe's ingredient list and time out of
// its markdown and scoring how much of it the user already has on hand. Keeping
// this pure makes it unit-testable in isolation (see recommend.test.ts) — the
// spec requires "recommendation matching" to have Vitest coverage.

import type { InventoryItem, RecipeEntry } from './schemas';

export interface RecipeRecommendation {
  filename: string;
  title: string;
  matchedIngredients: string[];
  matchCount: number;
  totalIngredients: number;
  matchRatio: number; // 0..1 share of recipe ingredients the pantry covers
  estimatedMinutes: number | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

// Generic words that shouldn't drive an ingredient match on their own.
const STOPWORDS = new Set([
  'fresh', 'extra', 'virgin', 'olive', 'ground', 'organic', 'large', 'small',
  'chopped', 'minced', 'cup', 'cups', 'tbsp', 'tsp', 'clove', 'cloves', 'and',
  'the', 'of', 'to', 'with',
]);

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** Extract the `- ` bullet lines under a `## Ingredients` heading. */
export function parseIngredients(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^#{1,6}\s*ingredients/i.test(l.trim()));
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^#{1,6}\s/.test(l)) break; // next section
    if (l.startsWith('-') || l.startsWith('*')) out.push(l.replace(/^[-*]\s*/, ''));
  }
  return out;
}

/** Sum "Prep Time"/"Cook Time" minutes from markdown; fall back to any "N min". */
export function parseEstimatedMinutes(markdown: string): number | null {
  let total = 0;
  let found = false;
  for (const label of ['prep', 'cook', 'total']) {
    const m = markdown.match(new RegExp(`${label}\\s*time\\**\\s*:?\\s*(\\d+)\\s*min`, 'i'));
    if (m) { total += Number(m[1]); found = true; }
  }
  if (found) return total;
  const any = markdown.match(/(\d+)\s*min/i);
  return any ? Number(any[1]) : null;
}

/** Difficulty heuristic from ingredient count and total time. */
export function estimateDifficulty(ingredientCount: number, minutes: number | null): 'Easy' | 'Medium' | 'Hard' {
  const many = ingredientCount >= 8;
  const long = minutes != null && minutes > 40;
  if (many && long) return 'Hard';
  if (many || long) return 'Medium';
  return 'Easy';
}

function titleOf(recipe: RecipeEntry): string {
  const h1 = recipe.content.split(/\r?\n/).find((l) => /^#\s+/.test(l.trim()));
  if (h1) return h1.replace(/^#\s+/, '').trim();
  return recipe.filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ').trim();
}

/**
 * Rank recipes by how many of their ingredients the current inventory covers.
 * Ties break toward the quicker recipe, then alphabetically for stability.
 * Recipes with zero matches are omitted — a recommendation you can't cook for
 * isn't a recommendation.
 */
export function recommendRecipes(inventory: InventoryItem[], recipes: RecipeEntry[]): RecipeRecommendation[] {
  const pantryTokens = new Set(inventory.flatMap((i) => tokenize(i.name)));

  const recs: RecipeRecommendation[] = recipes.map((recipe) => {
    const ingredients = parseIngredients(recipe.content);
    const matched: string[] = [];
    for (const ing of ingredients) {
      const ingTokens = tokenize(ing);
      if (ingTokens.some((t) => pantryTokens.has(t))) matched.push(ing);
    }
    const minutes = parseEstimatedMinutes(recipe.content);
    const total = ingredients.length;
    return {
      filename: recipe.filename,
      title: titleOf(recipe),
      matchedIngredients: matched,
      matchCount: matched.length,
      totalIngredients: total,
      matchRatio: total > 0 ? matched.length / total : 0,
      estimatedMinutes: minutes,
      difficulty: estimateDifficulty(total, minutes),
    };
  });

  return recs
    .filter((r) => r.matchCount > 0)
    .sort((a, b) =>
      (b.matchCount - a.matchCount) ||
      ((a.estimatedMinutes ?? Infinity) - (b.estimatedMinutes ?? Infinity)) ||
      a.title.localeCompare(b.title));
}
