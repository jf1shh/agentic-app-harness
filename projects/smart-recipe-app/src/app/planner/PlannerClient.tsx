'use client'

import { useState } from 'react'
import { MealPlanEntry, RecipeEntry } from '@/lib/types'
import { addMealPlanEntry, deleteMealPlanEntry } from '../actions'

export default function PlannerClient({ initialPlan, recipes }: { initialPlan: MealPlanEntry[], recipes: RecipeEntry[] }) {
  const [plan, setPlan] = useState<MealPlanEntry[]>(initialPlan)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recipeId, setRecipeId] = useState(recipes.length > 0 ? recipes[0].filename : '')
  const [mealType, setMealType] = useState('Dinner')

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeId) return
    await addMealPlanEntry(date, recipeId, mealType)
    setPlan(prev => [...prev, { id: `mp-${Date.now()}`, date, recipeId, mealType }])
  }

  const handleDelete = async (id: string) => {
    await deleteMealPlanEntry(id)
    setPlan(prev => prev.filter(entry => entry.id !== id))
  }

  // Group plan by date
  const groupedPlan: Record<string, MealPlanEntry[]> = {}
  plan.forEach(entry => {
    if (!groupedPlan[entry.date]) groupedPlan[entry.date] = []
    groupedPlan[entry.date].push(entry)
  })

  // Sort dates
  const sortedDates = Object.keys(groupedPlan).sort()

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
      <div className="glass-panel" style={{ alignSelf: 'start' }}>
        <h2>Schedule a Meal</h2>
        {recipes.length === 0 ? (
          <p>Please save some recipes first in the catalog.</p>
        ) : (
          <form onSubmit={handleAdd}>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="input-group">
              <label className="input-label">Meal Type</label>
              <select className="input-field" value={mealType} onChange={e => setMealType(e.target.value)}>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Recipe</label>
              <select className="input-field" value={recipeId} onChange={e => setRecipeId(e.target.value)}>
                {recipes.map(r => (
                  <option key={r.filename} value={r.filename}>{r.filename.replace('.md', '').replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add to Plan</button>
          </form>
        )}
      </div>

      <div className="glass-panel">
        <h2>Your Schedule</h2>
        {sortedDates.length === 0 ? (
          <p>Your meal plan is empty.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sortedDates.map(d => (
              <div key={d}>
                <h3 style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
                  {new Date(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {groupedPlan[d].map(entry => (
                    <li key={entry.id} className="flex justify-between items-center" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ color: 'var(--secondary-color)', marginRight: '0.5rem' }}>{entry.mealType}:</strong>
                        <span style={{ textTransform: 'capitalize' }}>{entry.recipeId.replace('.md', '').replace(/_/g, ' ')}</span>
                      </div>
                      <button onClick={() => handleDelete(entry.id)} className="btn btn-danger" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
