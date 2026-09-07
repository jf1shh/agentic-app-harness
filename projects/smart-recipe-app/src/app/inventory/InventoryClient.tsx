'use client'

import { useState, useRef, useEffect } from 'react'
import { InventoryItem } from '@/lib/types'
import { addInventoryItem, deleteInventoryItem, getInventory } from '../actions'

export default function InventoryClient({ initialInventory }: { initialInventory: InventoryItem[] }) {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [error, setError] = useState('')
  useEffect(() => { void getInventory().then(setInventory) }, [])
  const formRef = useRef<HTMLFormElement>(null)
  
  const handleAdd = async (formData: FormData) => {
    const item = await addInventoryItem(formData)
    if (!item) { setError('Could not save. Browser storage may be blocked or full.'); return }
    setError('')
    setInventory(await getInventory())
    formRef.current?.reset()
  }

  const handleDelete = async (id: string) => {
    if (!await deleteInventoryItem(id)) { setError('Could not remove this item.'); return }
    setError('')
    setInventory(await getInventory())
  }

  return (
    <div className="grid grid-sidebar">
      <div className="glass-panel" style={{ alignSelf: 'start' }}>
        <h2>Add Item</h2>
        {error && <p role="alert">{error}</p>}
        <form ref={formRef} action={handleAdd}>
          <div className="input-group">
            <label htmlFor="inventory-name" className="input-label">Item Name</label>
            <input id="inventory-name" type="text" name="name" className="input-field" required placeholder="e.g. Tomatoes" />
          </div>
          <div className="input-group">
            <label htmlFor="inventory-category" className="input-label">Category</label>
            <select id="inventory-category" name="category" className="input-field" required>
              <option value="fridge">Fridge</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="inventory-quantity" className="input-label">Quantity (optional)</label>
            <input id="inventory-quantity" type="text" name="quantity" className="input-field" placeholder="e.g. 2 lbs" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add to Inventory</button>
        </form>
      </div>

      <div className="glass-panel">
        <h2>Current Stock</h2>
        {inventory.length === 0 ? (
          <p>Your inventory is empty. Start adding items!</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inventory.map((item) => (
              <li key={item.id} className="flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', gap: '0.75rem' }}>
                <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <strong>{item.name}</strong>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({item.category})</span>
                  {item.quantity && <div style={{ fontSize: '0.9rem', color: 'var(--primary-color)' }}>Qty: {item.quantity}</div>}
                </div>
                <button onClick={() => handleDelete(item.id)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', flexShrink: 0 }}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
