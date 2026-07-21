'use server'

import { readInventory, writeInventory, readMealPlan, writeMealPlan, writeRecipe, readRecipes } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { InventoryItem, MealPlanEntry } from '@/lib/types'

export async function getInventory() {
  return readInventory()
}

export async function addInventoryItem(formData: FormData) {
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const quantity = formData.get('quantity') as string
  
  const inventory = readInventory()
  inventory.push({
    id: randomUUID(),
    name,
    category,
    quantity,
    addedAt: new Date().toISOString()
  })
  writeInventory(inventory)
  revalidatePath('/inventory')
  revalidatePath('/')
}

export async function deleteInventoryItem(id: string) {
  let inventory = readInventory()
  inventory = inventory.filter((item: InventoryItem) => item.id !== id)
  writeInventory(inventory)
  revalidatePath('/inventory')
  revalidatePath('/')
}

export async function getMealPlan() {
  return readMealPlan()
}

export async function addMealPlanEntry(date: string, recipeId: string, mealType: string) {
  const plan = readMealPlan()
  plan.push({ id: randomUUID(), date, recipeId, mealType })
  writeMealPlan(plan)
  revalidatePath('/planner')
}

export async function deleteMealPlanEntry(id: string) {
  let plan = readMealPlan()
  plan = plan.filter((entry: MealPlanEntry) => entry.id !== id)
  writeMealPlan(plan)
  revalidatePath('/planner')
}

export async function saveRecipeMarkdown(filename: string, content: string) {
  writeRecipe(filename, content)
  revalidatePath('/recipes')
}

export async function fetchAllRecipes() {
  return readRecipes()
}
