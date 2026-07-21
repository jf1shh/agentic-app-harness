import { getInventory } from '../actions'
import InventoryClient from './InventoryClient'

export default async function InventoryPage() {
  const inventory = await getInventory()
  
  return (
    <div>
      <h1 className="text-center mb-8">Inventory Management</h1>
      <InventoryClient initialInventory={inventory} />
    </div>
  )
}
