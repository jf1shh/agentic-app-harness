"use client";

import React, { useState } from 'react';
import { Garment } from '../types';

interface Props {
  garments: Garment[];
  tripDays: number;
}

export default function PackingChecklist({ garments, tripDays }: Props) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('packright_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load checklist state", e);
      return {};
    }
  });

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('packright_checklist', JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save checklist state", e);
      }
      return next;
    });
  };

  const handleReset = () => {
    setCheckedItems({});
    try {
      localStorage.removeItem('packright_checklist');
    } catch (e) {
      console.error("Failed to clear checklist state", e);
    }
  };

  // Build full list of items
  const essentials = [
    { id: 'essential-underwear', name: `${tripDays}x Pairs of Underwear`, category: 'Essentials' },
    { id: 'essential-socks', name: `${tripDays}x Pairs of Socks`, category: 'Essentials' },
    { id: 'essential-toiletries', name: '1x Toiletry Kit', category: 'Essentials' },
    { id: 'essential-tech', name: '1x Tech Pouch / Chargers', category: 'Essentials' },
  ];

  const totalItems = garments.length + essentials.length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>🎒 Physical Packing Checklist</h2>
        <button 
          onClick={handleReset} 
          className="btn-primary" 
          style={{ backgroundColor: '#64748b', fontSize: '0.85rem', padding: '6px 12px' }}
        >
          Reset Checkmarks
        </button>
      </div>

      <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '16px' }}>
        Check items off as you pack them into your suitcase. Progress is saved automatically.
      </p>

      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span><strong>Packing Progress:</strong> {checkedCount} / {totalItems} Packed</span>
          <span><strong>{progressPercent}%</strong></span>
        </div>
        <div style={{ width: '100%', backgroundColor: '#1e293b', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${progressPercent}%`, 
              backgroundColor: progressPercent === 100 ? '#22c55e' : 'var(--primary)', 
              height: '100%',
              transition: 'width 0.3s ease'
            }} 
          />
        </div>
      </div>

      {/* Wardrobe Items */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <h3 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Garments to Pack</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {garments.map(g => (
              <li 
                key={g.id} 
                onClick={() => toggleItem(g.id)}
                style={{ 
                  padding: '10px 12px', 
                  marginBottom: '8px', 
                  backgroundColor: checkedItems[g.id] ? 'rgba(34, 197, 94, 0.1)' : '#1e293b',
                  borderLeft: `4px solid ${checkedItems[g.id] ? '#22c55e' : '#475569'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textDecoration: checkedItems[g.id] ? 'line-through' : 'none',
                  color: checkedItems[g.id] ? '#94a3b8' : 'inherit'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={!!checkedItems[g.id]} 
                  onChange={() => {}} // handled by parent li click
                  style={{ cursor: 'pointer' }}
                />
                <span>{g.name} <small style={{ color: '#64748b' }}>({g.category})</small></span>
              </li>
            ))}
          </ul>
        </div>

        {/* Essentials */}
        <div>
          <h3 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Trip Essentials</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {essentials.map(item => (
              <li 
                key={item.id} 
                onClick={() => toggleItem(item.id)}
                style={{ 
                  padding: '10px 12px', 
                  marginBottom: '8px', 
                  backgroundColor: checkedItems[item.id] ? 'rgba(34, 197, 94, 0.1)' : '#1e293b',
                  borderLeft: `4px solid ${checkedItems[item.id] ? '#22c55e' : '#475569'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textDecoration: checkedItems[item.id] ? 'line-through' : 'none',
                  color: checkedItems[item.id] ? '#94a3b8' : 'inherit'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={!!checkedItems[item.id]} 
                  onChange={() => {}} // handled by parent li click
                  style={{ cursor: 'pointer' }}
                />
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
