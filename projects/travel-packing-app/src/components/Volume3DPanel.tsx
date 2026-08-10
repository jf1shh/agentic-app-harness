'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { VolumeBreakdownSlice, SLICE_COLORS } from '../utils/volumeBreakdown';
import { computeVolumeBlocks, SuitcaseDimensionsCm } from '../utils/volumeBlocks';
import { useT } from '../i18n/context';

interface Props {
  slices: VolumeBreakdownSlice[];
  suitcase: SuitcaseDimensionsCm;
}

function Volume3DLoading() {
  const { t } = useT();
  return (
    <div
      style={{
        width: '100%',
        height: '220px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
      }}
    >
      {t('knapsack.volume3DLoading')}
    </div>
  );
}

// Three.js/WebGL only ever runs in the browser -- this app is a Next.js
// static export (output: 'export'), so the scene itself must never be
// reachable from server-rendered code. next/dynamic({ ssr: false }) is what
// keeps it out of the server render path; Volume3DPanel itself stays a
// normal client component so its accessible label/description render
// immediately, independent of the (separately code-split) 3D bundle.
const Volume3DScene = dynamic(() => import('./Volume3DScene'), {
  ssr: false,
  loading: Volume3DLoading,
});

const DESCRIPTION_ID = 'volume-3d-breakdown';

export default function Volume3DPanel({ slices, suitcase }: Props) {
  const { t } = useT();

  // computeVolumeBlocks reads its cm3 figures straight from the slices
  // computeVolumeBreakdown() already produced -- no volume math is
  // recomputed here. See the "Explain the Arithmetic Without Re-implementing
  // It" lesson in .agents/AGENTS.md §6.
  const layout = useMemo(() => computeVolumeBlocks(slices, suitcase), [slices, suitcase]);

  if (slices.length === 0) return null;

  const summary = slices
    .map((slice) => `${slice.category} ${(slice.volumeCm3 / 1000).toFixed(1)}L ${slice.percent.toFixed(0)}%`)
    .join(', ');
  const ariaLabel = `${t('knapsack.volume3D')}: ${summary}`;

  return (
    <div>
      <div role="img" aria-label={ariaLabel} aria-describedby={DESCRIPTION_ID}>
        <Volume3DScene blocks={layout.blocks} suitcaseSize={layout.suitcaseSize} />
      </div>
      {layout.overCapacity && (
        <p role="status" style={{ fontSize: '0.85rem', color: 'orange', marginTop: '8px' }}>
          {t('knapsack.volume3DOverCapacity')}
        </p>
      )}
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>{t('knapsack.volume3DHint')}</p>
      <ul
        id={DESCRIPTION_ID}
        style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}
      >
        {slices.map((slice, i) => (
          <li key={slice.category} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span
              aria-hidden="true"
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length],
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>
              {slice.category} — {(slice.volumeCm3 / 1000).toFixed(1)}L ({slice.percent.toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
