import { fetchAllRecipes, getInventory } from '../actions'
import Link from 'next/link'
import {
  estimateDifficulty,
  parseEstimatedMinutes,
  parseIngredients,
  recommendRecipes,
  titleOf,
  type RecipeRecommendation,
} from '@/lib/recommend'

export default async function RecipesPage() {
  const recipes = await fetchAllRecipes()
  const inventory = await getInventory()
  const recipesByFilename = new Map(recipes.map((r) => [r.filename, r]))

  // Rank recipes the pantry already covers using the same recommendation
  // engine the home page uses, then append every other saved recipe with a
  // zero-match placeholder — recommendRecipes() itself omits zero-match
  // recipes, which is right for a "what can I cook" prompt but wrong here,
  // since the Catalog promises to browse everything the user has saved.
  const matched = recommendRecipes(inventory, recipes)
  const matchedFilenames = new Set(matched.map((r) => r.filename))
  const unmatched: RecipeRecommendation[] = recipes
    .filter((r) => !matchedFilenames.has(r.filename))
    .map((r) => {
      const ingredients = parseIngredients(r.content)
      const estimatedMinutes = parseEstimatedMinutes(r.content)
      return {
        filename: r.filename,
        title: titleOf(r),
        matchedIngredients: [],
        matchCount: 0,
        totalIngredients: ingredients.length,
        matchRatio: 0,
        estimatedMinutes,
        difficulty: estimateDifficulty(ingredients.length, estimatedMinutes),
      }
    })
  const scoredRecipes = [...matched, ...unmatched]

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
          {scoredRecipes.map((r) => (
            <div key={r.filename} className="glass-panel">
              <h2>{r.title}</h2>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--secondary-color)' }}>⏱️ {r.estimatedMinutes != null ? `${r.estimatedMinutes} mins` : 'unknown time'}</span>
                <span style={{ color: r.difficulty === 'Easy' ? 'var(--primary-color)' : r.difficulty === 'Hard' ? 'var(--danger-color)' : 'var(--secondary-color)' }}>
                  🔥 {r.difficulty}
                </span>
              </div>

              {r.matchCount > 0 && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <strong style={{ color: 'var(--primary-color)' }}>✨ Matches your inventory:</strong> {r.matchedIngredients.join(', ')}
                </div>
              )}

              <details style={{ marginTop: '1rem', cursor: 'pointer' }}>
                <summary style={{ color: 'var(--text-secondary)' }}>View Recipe Markdown</summary>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  {recipesByFilename.get(r.filename)?.content}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
