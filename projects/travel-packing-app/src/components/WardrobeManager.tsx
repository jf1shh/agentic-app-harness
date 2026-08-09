'use client';

import React, { useState, useEffect } from 'react';
import { Garment } from '../types';
import { saveItemImage, getItemImage, deleteItemImage, checkStorageQuota } from '../services/db';
import { buildManualGarment, ManualGarmentInput } from '../utils/wardrobeBuilder';
import { COLOR_MATCHES } from '../utils/generator';

interface Props {
  garments: Garment[];
  setGarments: (garments: Garment[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ROLES: { value: ManualGarmentInput['role']; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'topper', label: 'Topper / Outerwear' },
  { value: 'layer', label: 'Layer' },
];

const COLORS = Object.keys(COLOR_MATCHES);

export default function WardrobeManager({ garments, setGarments, isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<ManualGarmentInput['role']>('top');
  const [color, setColor] = useState('black');
  const [isEvening, setIsEvening] = useState(false);

  const [images, setImages] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [lowSpace, setLowSpace] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      const entries = await Promise.all(garments.map(async (g) => [g.id, await getItemImage(g.id)] as const));
      const loaded = entries.filter((entry): entry is [string, string] => entry[1] !== null);
      if (active) setImages(Object.fromEntries(loaded));
    })();
    checkStorageQuota().then((q) => {
      if (active) setLowSpace(q.lowSpace);
    });
    return () => {
      active = false;
    };
  }, [isOpen, garments]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const garment = buildManualGarment({ name, role, color, isEvening }, id);
    setGarments([...garments, garment]);
    setName('');
  };

  const handleDelete = (id: string) => {
    setGarments(garments.filter((g) => g.id !== id));
    deleteItemImage(id);
    setImages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleImageUpload = async (id: string, file: File) => {
    setProcessing((prev) => ({ ...prev, [id]: true }));
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blobURL = URL.createObjectURL(file);
      const imageBlob = await removeBackground(blobURL);
      const reader = new FileReader();
      reader.readAsDataURL(imageBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        await saveItemImage(id, base64data);
        setImages((prev) => ({ ...prev, [id]: base64data }));
        setProcessing((prev) => ({ ...prev, [id]: false }));
      };
    } catch (err) {
      console.error('Background removal failed', err);
      setProcessing((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Digital Closet"
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        className="glass-panel"
        style={{ width: '100%', maxWidth: '420px', height: '100%', overflowY: 'auto', padding: '24px', borderRadius: 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Digital Closet</h2>
          <button className="btn-secondary" onClick={onClose} aria-label="Close digital closet">✕</button>
        </div>

        {lowSpace && (
          <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', fontSize: '0.85rem' }}>
            ⚠️ Your device is low on storage space. New garment photos may fail to save.
          </div>
        )}

        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <label htmlFor="closet-item-name" className="label">Item name</label>
            <input
              id="closet-item-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grey Merino Turtleneck"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '12px' }}>
            <div>
              <label htmlFor="closet-item-role" className="label">Role</label>
              <select id="closet-item-role" className="input-field" value={role} onChange={(e) => setRole(e.target.value as ManualGarmentInput['role'])}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="closet-item-color" className="label">Color</label>
              <select id="closet-item-color" className="input-field" value={color} onChange={(e) => setColor(e.target.value)}>
                {COLORS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={isEvening} onChange={(e) => setIsEvening(e.target.checked)} />
            Evening / formal wear
          </label>
          <button type="submit" className="btn-primary">Add to closet</button>
        </form>

        <h3 style={{ marginBottom: '12px' }}>Your items ({garments.length})</h3>
        {garments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No items yet. Add your first garment above.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {garments.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {images[g.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={images[g.id]} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : processing[g.id] ? (
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center' }}>AI...</span>
                  ) : (
                    <label style={{ cursor: 'pointer', fontSize: '1rem' }}>
                      📷
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(g.id, e.target.files[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{g.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {g.roles.join(', ')} • {g.colors.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  aria-label={`Delete ${g.name}`}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
