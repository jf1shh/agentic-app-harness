'use client'

import { useState } from 'react'
import Image from 'next/image'
import { searchMeals } from '@/lib/mealSearch'
import { saveRecipeMarkdown } from '@/app/actions'

export default function SearchClient() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Record<string, string>[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const meals = await searchMeals(query)
      setResults(meals)
      if (!meals.length) setMessage('No recipes found.')
    } catch {
      setResults([])
      setMessage('Failed to search recipes.')
    }
    setLoading(false)
  }

  const saveRecipe = async (meal: Record<string, string>) => {
    const filename = `${meal.strMeal.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    
    // Parse ingredients
    const ingredients = []
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`]
      const msr = meal[`strMeasure${i}`]
      if (ing && ing.trim()) {
        ingredients.push(`- ${msr ? msr.trim() + ' ' : ''}${ing.trim()}`)
      }
    }

    const markdown = `# ${meal.strMeal}

**Category:** ${meal.strCategory}
**Area:** ${meal.strArea}

![${meal.strMeal}](${meal.strMealThumb})

## Ingredients
${ingredients.join('\n')}

## Instructions
${meal.strInstructions}

${meal.strYoutube ? `[Watch on YouTube](${meal.strYoutube})` : ''}
`
    const saved = await saveRecipeMarkdown(filename, markdown)
    setMessage(saved ? `Saved ${meal.strMeal} to catalog!` : 'Could not save this recipe. Browser storage may be blocked or full.')
  }

  return (
    <div className="glass-panel">
      <form onSubmit={search} className="flex gap-4 items-center mb-8">
        <div className="input-group" style={{ marginBottom: 0, flexGrow: 1 }}>
          <input 
            type="text" 
            className="input-field" 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            aria-label="Search recipes"
            maxLength={200}
            placeholder="Search for a recipe (e.g. Chicken, Pasta)..." 
            required 
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {message && <p className="text-center" style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>{message}</p>}

      <div className="grid grid-cols-3">
        {results.map((meal: Record<string, string>) => (
          <div key={meal.idMeal} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', width: '100%', height: '200px', marginBottom: '1rem' }}>
              <Image src={meal.strMealThumb} alt={meal.strMeal} fill style={{ objectFit: 'cover', borderRadius: '8px' }} sizes="(max-width: 768px) 100vw, 33vw" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>{meal.strMeal}</h2>
            <p style={{ fontSize: '0.85rem', flexGrow: 1 }}>{meal.strCategory} | {meal.strArea}</p>
            <button onClick={() => saveRecipe(meal)} className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Recipe</button>
          </div>
        ))}
      </div>
    </div>
  )
}
