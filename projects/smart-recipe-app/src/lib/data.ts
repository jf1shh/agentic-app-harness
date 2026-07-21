import fs from 'fs';
import path from 'path';
import { InventoryItem, MealPlanEntry, RecipeEntry } from './types';

const dataDir = path.join(process.cwd(), 'data');
const inventoryFile = path.join(dataDir, 'inventory.json');
const mealPlanFile = path.join(dataDir, 'meal-plan.json');
const recipesDir = path.join(dataDir, 'recipes');

// Ensure data directories exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(recipesDir)) {
  fs.mkdirSync(recipesDir, { recursive: true });
}

// Ensure JSON files exist
if (!fs.existsSync(inventoryFile)) {
  fs.writeFileSync(inventoryFile, JSON.stringify([]));
}
if (!fs.existsSync(mealPlanFile)) {
  fs.writeFileSync(mealPlanFile, JSON.stringify([]));
}

export function readInventory(): InventoryItem[] {
  const data = fs.readFileSync(inventoryFile, 'utf-8');
  return JSON.parse(data);
}

export function writeInventory(inventory: InventoryItem[]) {
  fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));
}

export function readMealPlan(): MealPlanEntry[] {
  const data = fs.readFileSync(mealPlanFile, 'utf-8');
  return JSON.parse(data);
}

export function writeMealPlan(mealPlan: MealPlanEntry[]) {
  fs.writeFileSync(mealPlanFile, JSON.stringify(mealPlan, null, 2));
}

export function readRecipes(): RecipeEntry[] {
  const files = fs.readdirSync(recipesDir);
  const recipes: RecipeEntry[] = [];
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(recipesDir, file), 'utf-8');
      recipes.push({ filename: file, content });
    }
  }
  return recipes;
}

export function writeRecipe(filename: string, content: string) {
  fs.writeFileSync(path.join(recipesDir, filename), content);
}
