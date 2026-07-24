import { getInventory, fetchAllRecipes } from './actions'
import Link from 'next/link'
import { recommendRecipes } from '@/lib/recommend'

export default async function Home() {
  const inventory = await getInventory()
  const recipes = await fetchAllRecipes()

  const recommendations = recommendRecipes(inventory, recipes).slice(0, 3)

  return (
    <div>
      <h1 className="mb-8 text-center">Welcome to SmartRecipe</h1>

      <div className="grid grid-cols-2">
        <div className="glass-panel text-center">
          <h2>Your Inventory</h2>
          <p className="mt-4">
            <strong>{inventory.length}</strong> items tracked across your fridge &amp; pantry.
          </p>
          <div className="mt-4">
            <Link href="/inventory" className="btn btn-primary">Manage Inventory</Link>
          </div>
        </div>

        <div className="glass-panel text-center">
          <h2>Your Recipes</h2>
          <p className="mt-4">
            You have <strong>{recipes.length}</strong> saved recipes.
          </p>
          <div className="mt-4 flex gap-4" style={{justifyContent: 'center'}}>
            <Link href="/recipes" className="btn btn-primary">View Catalog</Link>
            <Link href="/recipes/search" className="btn btn-primary" style={{backgroundColor: 'var(--secondary-color)'}}>Find New</Link>
          </div>
        </div>
      </div>

      <div className="glass-panel mt-8">
        <h2 className="mb-4">Cook with what you have</h2>
        {recommendations.length === 0 ? (
          <p>Add ingredients to your inventory to get recipe recommendations.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {recommendations.map((rec) => (
              <li key={rec.filename} className="mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>
                  <strong>{rec.title}</strong>
                  <br />
                  <small>
                    {rec.matchCount}/{rec.totalIngredients} ingredients on hand · {rec.difficulty}
                    {rec.estimatedMinutes != null ? ` · ~${rec.estimatedMinutes} min` : ''}
                  </small>
                </span>
                <Link href="/recipes" className="btn btn-primary">View</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
