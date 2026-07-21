import { getMealPlan, fetchAllRecipes } from '../actions'
import PlannerClient from './PlannerClient'

export default async function PlannerPage() {
  const plan = await getMealPlan()
  const recipes = await fetchAllRecipes()
  
  return (
    <div>
      <h1 className="text-center mb-8">Meal Prep Planner</h1>
      <PlannerClient initialPlan={plan} recipes={recipes} />
    </div>
  )
}
