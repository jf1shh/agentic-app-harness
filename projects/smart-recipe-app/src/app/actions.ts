import { readInventory, writeInventory, readMealPlan, writeMealPlan, writeRecipe, readRecipes } from '@/lib/data'
import { InventoryItem, MealPlanEntry } from '@/lib/types'

function generateId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export async function getInventory() {
  return readInventory()
}

export async function addInventoryItem(formData: FormData) {
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const quantity = formData.get('quantity') as string
  
  const inventory = readInventory()
  inventory.push({
    id: generateId(),
    name,
    category,
    quantity,
    addedAt: new Date().toISOString()
  })
  writeInventory(inventory)
}

export async function deleteInventoryItem(id: string) {
  let inventory = readInventory()
  inventory = inventory.filter((item: InventoryItem) => item.id !== id)
  writeInventory(inventory)
}

export async function getMealPlan() {
  return readMealPlan()
}

export async function addMealPlanEntry(date: string, recipeId: string, mealType: string) {
  const plan = readMealPlan()
  plan.push({ id: generateId(), date, recipeId, mealType })
  writeMealPlan(plan)
}

export async function deleteMealPlanEntry(id: string) {
  let plan = readMealPlan()
  plan = plan.filter((entry: MealPlanEntry) => entry.id !== id)
  writeMealPlan(plan)
}

export async function saveRecipeMarkdown(filename: string, content: string) {
  writeRecipe(filename, content)
}

export async function fetchAllRecipes() {
  return readRecipes()
}
