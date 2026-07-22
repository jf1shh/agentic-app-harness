"use client";
import React, { useState, useEffect } from 'react';
import { WearabilityReport, Garment } from '../types';
import { saveItemImage, getItemImage } from '../services/db';
import PackingChecklist from './PackingChecklist';

interface Props {
  report: WearabilityReport;
  garments: Garment[];
}

export default function WardrobeAnalyzer({ report, garments }: Props) {
  const getGarmentName = (id: string) => garments.find(g => g.id === id)?.name || id;

  const [images, setImages] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const loadImages = async () => {
      const loaded: Record<string, string> = {};
      for (const g of garments) {
        const img = await getItemImage(g.id);
        if (img) loaded[g.id] = img;
      }
      if (active) setImages(loaded);
    };
    loadImages();
    return () => { active = false; };
  }, [garments]);

  const handleImageUpload = async (id: string, file: File) => {
    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blobURL = URL.createObjectURL(file);
      const imageBlob = await removeBackground(blobURL);
      const reader = new FileReader();
      reader.readAsDataURL(imageBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        await saveItemImage(id, base64data);
        setImages(prev => ({ ...prev, [id]: base64data }));
        setProcessing(prev => ({ ...prev, [id]: false }));
      };
    } catch (e) {
      console.error(e);
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: '32px', padding: '24px' }}>
      <h2 style={{ marginBottom: '24px', color: 'var(--primary)' }}>Wardrobe Wearability Report</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Flexibility Score</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {(report.flexibilityScore * 100).toFixed(0)}%
          </p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>MVP Item</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>
            {report.mvpItemId ? getGarmentName(report.mvpItemId) : 'None'}
          </p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '16px', border: '1px solid #ef4444' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#ef4444' }}>Dead Weight</h3>
          <p style={{ fontSize: '1.1rem', marginTop: '8px' }}>
            {report.deadWeightIds.length > 0 
              ? report.deadWeightIds.map(getGarmentName).join(', ') 
              : 'None! Perfect packing.'}
          </p>
        </div>
      </div>

      {report.swapSuggestion && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '32px', borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '8px' }}>💡 Smart Swap Suggestion</h3>
          <p><strong>Swap out:</strong> {getGarmentName(report.swapSuggestion.removeId)}</p>
          <p><strong>Swap in:</strong> {report.swapSuggestion.suggestion}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}><em>Why? {report.swapSuggestion.reason}</em></p>
        </div>
      )}

      <h3 style={{ marginBottom: '16px' }}>Digital Closet</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        {garments.map(g => (
          <div key={g.id} className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', margin: '0 auto 8px auto', backgroundColor: '#1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {images[g.id] ? (
                <img src={images[g.id]} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : processing[g.id] ? (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AI Magic...</span>
              ) : (
                <label style={{ cursor: 'pointer', color: 'var(--primary)' }}>
                  + Photo
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(g.id, e.target.files[0])} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{g.name}</p>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: '16px' }}>3-Day Outfit Schedule</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.scheduledOutfits.map(({ day, outfit }) => (
          <div key={day} className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
            <h4 style={{ marginBottom: '12px' }}>Day {day}</h4>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', backgroundColor: '#1e293b', borderRadius: '4px', marginBottom: '4px' }}>
                  {images[outfit.top.id] && <img src={images[outfit.top.id]} alt="Top" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                </div>
                <small>Top: {outfit.top.name}</small>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', backgroundColor: '#1e293b', borderRadius: '4px', marginBottom: '4px' }}>
                  {images[outfit.bottom.id] && <img src={images[outfit.bottom.id]} alt="Bottom" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                </div>
                <small>Bottom: {outfit.bottom.name}</small>
              </div>
              {outfit.topper && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', backgroundColor: '#1e293b', borderRadius: '4px', marginBottom: '4px' }}>
                    {images[outfit.topper.id] && <img src={images[outfit.topper.id]} alt="Layer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                  </div>
                  <small>Layer: {outfit.topper.name}</small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <PackingChecklist garments={garments} tripDays={report.scheduledOutfits.length || 3} />
    </div>
  );
}
