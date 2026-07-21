import { getInventory, fetchAllRecipes } from './actions'
import Link from 'next/link'
import { InventoryItem } from '@/lib/types'

export default async function Home() {
  const inventory = await getInventory()
  const recipes = await fetchAllRecipes()

  const fridgeItems = inventory.filter((i: InventoryItem) => i.category === 'fridge').length
  const pantryItems = inventory.filter((i: InventoryItem) => i.category === 'pantry').length

  return (
    <div>
      <h1 className="mb-8 text-center">Welcome to SmartRecipe</h1>
      
      <div className="grid grid-cols-2">
        <div className="glass-panel text-center">
          <h2>Your Inventory</h2>
          <p className="mt-4">
            <strong>{fridgeItems}</strong> items in Fridge <br/>
            <strong>{pantryItems}</strong> items in Pantry
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
    </div>
  )
}
