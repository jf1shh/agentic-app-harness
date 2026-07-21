'use client'

import { useRef } from 'react'
import { InventoryItem } from '@/lib/types'

export default function InventoryClient({ initialInventory, addAction, deleteAction }: { initialInventory: InventoryItem[], addAction: (data: FormData) => Promise<void>, deleteAction: (id: string) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null)
  
  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
      <div className="glass-panel" style={{ alignSelf: 'start' }}>
        <h2>Add Item</h2>
        <form ref={formRef} action={async (formData) => {
          await addAction(formData)
          formRef.current?.reset()
        }}>
          <div className="input-group">
            <label className="input-label">Item Name</label>
            <input type="text" name="name" className="input-field" required placeholder="e.g. Tomatoes" />
          </div>
          <div className="input-group">
            <label className="input-label">Category</label>
            <select name="category" className="input-field" required>
              <option value="fridge">Fridge</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Quantity (optional)</label>
            <input type="text" name="quantity" className="input-field" placeholder="e.g. 2 lbs" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add to Inventory</button>
        </form>
      </div>

      <div className="glass-panel">
        <h2>Current Stock</h2>
        {initialInventory.length === 0 ? (
          <p>Your inventory is empty. Start adding items!</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {initialInventory.map((item) => (
              <li key={item.id} className="flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <strong>{item.name}</strong> 
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({item.category})</span>
                  {item.quantity && <div style={{ fontSize: '0.9rem', color: 'var(--primary-color)' }}>Qty: {item.quantity}</div>}
                </div>
                <button onClick={() => deleteAction(item.id)} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
