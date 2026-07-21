export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  addedAt: string;
}

export interface MealPlanEntry {
  id: string;
  date: string;
  recipeId: string;
  mealType: string;
}

export interface RecipeEntry {
  filename: string;
  content: string;
}
