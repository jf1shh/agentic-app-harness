'use client';
import { PackingItem } from '../types';

interface PackingListProps {
  items: PackingItem[];
  onToggle: (id: string) => void;
}

export default function PackingList({ items, onToggle }: PackingListProps) {
  const categories = Array.from(new Set(items.map(i => i.category)));

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
      <h2>Your Packing List</h2>
      
      {categories.map(category => (
        <div key={category} style={{ marginTop: '20px' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '12px', fontSize: '1.1rem' }}>{category}</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.filter(i => i.category === category).map(item => (
              <li 
                key={item.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  opacity: item.isPacked ? 0.6 : 1
                }}
                onClick={() => onToggle(item.id)}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: `2px solid ${item.isPacked ? 'var(--success)' : 'var(--border)'}`,
                  background: item.isPacked ? 'var(--success)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {item.isPacked && '✓'}
                </div>
                <span style={{ 
                  textDecoration: item.isPacked ? 'line-through' : 'none',
                  flexGrow: 1
                }}>
                  {item.name}
                </span>
                <span style={{
                  background: 'var(--background)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}>
                  Qty: {item.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
