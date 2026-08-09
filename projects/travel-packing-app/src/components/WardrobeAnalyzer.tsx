"use client";
import React, { useState, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import { WearabilityReport, Garment } from '../types';
import { saveItemImage, getItemImage } from '../services/db';
import { OutfitRole } from '../utils/outfitEditor';
import PackingChecklist from './PackingChecklist';
import { useT } from '../i18n/context';

interface Props {
  report: WearabilityReport;
  garments: Garment[];
  destinationCountryCode: string | null;
  onOutfitSwap: (day: number, role: OutfitRole, garmentId: string) => boolean;
}

const DROP_ID_SEPARATOR = '::';
const dropId = (day: number, role: OutfitRole) => `${day}${DROP_ID_SEPARATOR}${role}`;

function DraggableGarmentTile({ garment, children }: { garment: Garment; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: garment.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Drag ${garment.name}`}
      style={{ cursor: 'grab', opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
    >
      {children}
    </div>
  );
}

function OutfitSlot({
  day,
  role,
  label,
  image,
}: {
  day: number;
  role: OutfitRole;
  label: string;
  image: string | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(day, role) });
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        ref={setNodeRef}
        role="group"
        aria-label={`Day ${day} ${role} slot`}
        style={{
          width: '60px',
          height: '60px',
          backgroundColor: isOver ? 'rgba(99, 102, 241, 0.3)' : '#1e293b',
          border: isOver ? '2px dashed var(--primary)' : '2px solid transparent',
          borderRadius: '4px',
          marginBottom: '4px',
        }}
      >
        {image && <img src={image} alt={role} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
      </div>
      <small>{label}</small>
    </div>
  );
}

export default function WardrobeAnalyzer({ report, garments, destinationCountryCode, onOutfitSwap }: Props) {
  const { t } = useT();
  const getGarmentName = (id: string) => garments.find(g => g.id === id)?.name || id;

  const [images, setImages] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [swapMessage, setSwapMessage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));

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

  useEffect(() => {
    if (!swapMessage) return;
    const timer = setTimeout(() => setSwapMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [swapMessage]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (typeof overId !== 'string') return;
    const [dayStr, role] = overId.split(DROP_ID_SEPARATOR);
    const day = Number(dayStr);
    const garmentId = String(event.active.id);
    const garment = garments.find(g => g.id === garmentId);

    const accepted = onOutfitSwap(day, role as OutfitRole, garmentId);
    setSwapMessage(
      accepted
        ? t('wearability.swapAccepted', { name: garment?.name ?? garmentId, day })
        : t('wearability.swapRejected', { name: garment?.name ?? garmentId })
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
    <div className="glass-panel" style={{ marginTop: '32px', padding: '24px' }}>
      <div className="no-print">
      <h2 style={{ marginBottom: '24px', color: 'var(--primary)' }}>{t('wearability.title')}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{t('wearability.flexibilityScore')}</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {(report.flexibilityScore * 100).toFixed(0)}%
          </p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{t('wearability.mvpItem')}</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>
            {report.mvpItemId ? getGarmentName(report.mvpItemId) : t('wearability.none')}
          </p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '16px', border: '1px solid #ef4444' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#ef4444' }}>{t('wearability.deadWeight')}</h3>
          <p style={{ fontSize: '1.1rem', marginTop: '8px' }}>
            {report.deadWeightIds.length > 0
              ? report.deadWeightIds.map(getGarmentName).join(', ')
              : t('wearability.perfectPacking')}
          </p>
        </div>
      </div>

      {report.swapSuggestion && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '32px', borderLeft: '4px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <h3 style={{ color: '#f59e0b', marginBottom: '8px' }}>{t('wearability.swapSuggestion')}</h3>
          <p><strong>{t('wearability.swapOut')}</strong> {getGarmentName(report.swapSuggestion.removeId)}</p>
          <p><strong>{t('wearability.swapIn')}</strong> {report.swapSuggestion.suggestion}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}><em>{t('wearability.why', { reason: report.swapSuggestion.reason })}</em></p>
        </div>
      )}

      <h3 style={{ marginBottom: '4px' }}>{t('wearability.digitalCloset')}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{t('wearability.dragHint')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px', marginBottom: '32px' }}>
        {garments.map(g => (
          <DraggableGarmentTile key={g.id} garment={g}>
            <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', margin: '0 auto 8px auto', backgroundColor: '#1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {images[g.id] ? (
                  <img src={images[g.id]} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : processing[g.id] ? (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t('wearability.aiMagic')}</span>
                ) : (
                  <label style={{ cursor: 'pointer', color: '#38bdf8' }} onPointerDown={(e) => e.stopPropagation()}>
                    {t('wearability.addPhoto')}
                    <input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(g.id, e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{g.name}</p>
            </div>
          </DraggableGarmentTile>
        ))}
      </div>

      <h3 style={{ marginBottom: '16px' }}>{t('wearability.outfitSchedule')}</h3>
      {swapMessage && (
        <p role="status" style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--primary)' }}>{swapMessage}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.scheduledOutfits.map(({ day, outfit }) => (
          <div key={day} className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
            <h4 style={{ marginBottom: '12px' }}>{t('wearability.day', { n: day })}</h4>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <OutfitSlot day={day} role="top" label={t('wearability.top', { name: outfit.top.name })} image={images[outfit.top.id]} />
              <OutfitSlot day={day} role="bottom" label={t('wearability.bottom', { name: outfit.bottom.name })} image={images[outfit.bottom.id]} />
              {outfit.topper && (
                <OutfitSlot day={day} role="topper" label={t('wearability.layer', { name: outfit.topper.name })} image={images[outfit.topper.id]} />
              )}
            </div>
          </div>
        ))}
      </div>
      </div>

      <PackingChecklist garments={garments} tripDays={report.scheduledOutfits.length || 3} destinationCountryCode={destinationCountryCode} />
    </div>
    </DndContext>
  );
}
