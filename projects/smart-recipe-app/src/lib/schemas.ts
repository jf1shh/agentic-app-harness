import { z } from 'zod';

// Contract-first runtime schemas. These are the single source of truth for the
// app's data models; the TypeScript types in ./types are inferred from them
// (z.infer) so the compile-time and runtime contracts can never drift apart.
// data.ts validates every value read from localStorage against these before use.

export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  quantity: z.string().optional(),
  addedAt: z.string(),
});

export const MealPlanEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  recipeId: z.string(),
  mealType: z.string(),
});

export const RecipeEntrySchema = z.object({
  filename: z.string(),
  content: z.string(),
});

export const InventorySchema = z.array(InventoryItemSchema);
export const MealPlanSchema = z.array(MealPlanEntrySchema);
export const RecipesSchema = z.array(RecipeEntrySchema);

export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type MealPlanEntry = z.infer<typeof MealPlanEntrySchema>;
export type RecipeEntry = z.infer<typeof RecipeEntrySchema>;
