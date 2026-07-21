import { fetchAllRecipes, getInventory } from '../actions'
import Link from 'next/link'
import { InventoryItem, RecipeEntry } from '@/lib/types'

export default async function RecipesPage() {
  const recipes = await fetchAllRecipes()
  const inventory = await getInventory()
  
  // Basic recipe recommendation based on inventory
  // If an inventory item name appears in the recipe content, it gets a point.
  const inventoryNames = inventory.map((i: InventoryItem) => i.name.toLowerCase())
  
  const scoredRecipes = recipes.map((r: RecipeEntry) => {
    const content = r.content.toLowerCase()
    let score = 0
    const matchNames: string[] = []
    
    inventoryNames.forEach((name: string) => {
      if (content.includes(name)) {
        score++
        matchNames.push(name)
      }
    })

    // Parse difficulty and time roughly
    // TheMealDB doesn't provide time natively in standard search, so we mock it based on content length for MVP
    const cookTime = Math.floor(r.content.length / 100) + 10 // Mock estimation
    let difficulty = 'Medium'
    if (cookTime < 20) difficulty = 'Easy'
    if (cookTime > 45) difficulty = 'Hard'

    return { ...r, score, matchNames, cookTime, difficulty }
  }).sort((a: RecipeEntry & {score: number}, b: RecipeEntry & {score: number}) => b.score - a.score)

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1>Your Recipe Catalog</h1>
        <Link href="/recipes/search" className="btn btn-primary">Find New Recipes</Link>
      </div>

      {scoredRecipes.length === 0 ? (
        <div className="glass-panel text-center">
          <p>You haven&apos;t saved any recipes yet.</p>
          <Link href="/recipes/search" className="btn btn-primary mt-4">Search Now</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2">
          {scoredRecipes.map((r: RecipeEntry & {score: number, matchNames: string[], cookTime: number, difficulty: string}) => (
            <div key={r.filename} className="glass-panel">
              <h2 style={{ textTransform: 'capitalize' }}>{r.filename.replace('.md', '').replace(/_/g, ' ')}</h2>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--secondary-color)' }}>⏱️ {r.cookTime} mins</span>
                <span style={{ color: r.difficulty === 'Easy' ? 'var(--primary-color)' : r.difficulty === 'Hard' ? 'var(--danger-color)' : 'var(--secondary-color)' }}>
                  🔥 {r.difficulty}
                </span>
              </div>

              {r.score > 0 && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--primary-color)' }}>✨ Matches your inventory:</strong> {r.matchNames.join(', ')}
                </div>
              )}
              
              <details style={{ marginTop: '1rem', cursor: 'pointer' }}>
                <summary style={{ color: 'var(--text-secondary)' }}>View Recipe Markdown</summary>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  {r.content}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
