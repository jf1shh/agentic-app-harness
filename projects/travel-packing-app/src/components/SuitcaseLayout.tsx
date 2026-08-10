"use client";

import React, { useEffect, useState } from 'react';
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
import { Garment } from '../types';
import { buildSuitcaseLayout, reorderSuitcaseLayout, SuitcaseLayoutTile } from '../utils/suitcaseLayout';
import { useT } from '../i18n/context';

interface Props {
  // The already-packed subset (getPackedGarments(report, garments)) -- this
  // component only orders that set, it never re-derives what's packed.
  garments: Garment[];
}

// A stable string key over which garments are packed, independent of the
// array's object identity -- page.tsx computes `garments` fresh on every
// render (getPackedGarments(...) inline in JSX), so effects here must not
// depend on the array reference or they'd re-run on every unrelated
// keystroke in the trip form.
function packedIdsKeyOf(garments: Garment[]): string {
  return garments.map((g) => g.id).join('|');
}

function LayoutTile({
  tile,
  total,
  children,
}: {
  tile: SuitcaseLayoutTile;
  total: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: tile.garmentId });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: tile.garmentId });

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      {...listeners}
      {...attributes}
      role="group"
      aria-label={`Reorder ${tile.name}, currently position ${tile.position + 1} of ${total}`}
      style={{
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
        border: isOver ? '2px dashed var(--primary)' : '2px solid transparent',
        borderRadius: '8px',
      }}
    >
      {children}
    </div>
  );
}

export default function SuitcaseLayout({ garments }: Props) {
  const { t } = useT();
  const [order, setOrder] = useState<string[]>(() => buildSuitcaseLayout(garments, []).map((tile) => tile.garmentId));
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const idsKey = packedIdsKeyOf(garments);

  // Keeps `order` a complete, de-duplicated id list whenever the packed set
  // changes (a new Analyze run, a swap in the Outfit Editor above). This is
  // React's own "adjusting state when a prop changes" pattern -- setState
  // during render, guarded by comparing to the previously-seen key -- rather
  // than a useEffect, since setState synchronously inside an effect body
  // triggers an avoidable extra render (react-hooks/set-state-in-effect).
  // Reuses buildSuitcaseLayout's own merge logic rather than a second
  // append/prune implementation.
  const [lastIdsKey, setLastIdsKey] = useState(idsKey);
  if (idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    setOrder(buildSuitcaseLayout(garments, order).map((tile) => tile.garmentId));
  }

  useEffect(() => {
    if (!moveMessage) return;
    const timer = setTimeout(() => setMoveMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [moveMessage]);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));
  const tiles = buildSuitcaseLayout(garments, order);

  if (tiles.length === 0) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (typeof overId !== 'string') return;
    const activeId = String(event.active.id);
    if (activeId === overId) return;

    const garment = garments.find((g) => g.id === activeId);
    setOrder((prev) => {
      const next = reorderSuitcaseLayout(prev, activeId, overId);
      if (next !== prev) {
        const newPosition = next.indexOf(activeId) + 1;
        setMoveMessage(t('suitcaseLayout.moved', { name: garment?.name ?? activeId, position: newPosition }));
      }
      return next;
    });
  };

  return (
    <div>
      <h3 style={{ marginBottom: '4px' }}>{t('suitcaseLayout.title')}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
        {t('suitcaseLayout.dragHint')}
      </p>
      {moveMessage && (
        <p role="status" style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--primary)' }}>
          {moveMessage}
        </p>
      )}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <ol
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
            gap: '12px',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {tiles.map((tile) => (
            <li key={tile.garmentId}>
              <LayoutTile tile={tile} total={tiles.length}>
                <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                  <span aria-hidden="true" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t('suitcaseLayout.position', { n: tile.position + 1 })}
                  </span>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>{tile.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {tile.category} · {(tile.volumeCm3 / 1000).toFixed(1)}L
                  </span>
                </div>
              </LayoutTile>
            </li>
          ))}
        </ol>
      </DndContext>
    </div>
  );
}
