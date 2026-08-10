"use client";

import React from 'react';
import { VolumeBreakdownSlice } from '../utils/volumeBreakdown';
import { useT } from '../i18n/context';

interface Props {
  slices: VolumeBreakdownSlice[];
}

const SLICE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#eab308', '#8b5cf6', '#ef4444'];
const RADIUS = 60;
const STROKE_WIDTH = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function VolumeDonutChart({ slices }: Props) {
  const { t } = useT();

  if (slices.length === 0) return null;

  // Each slice's starting offset is the cumulative percent of every slice
  // before it — computed up front rather than mutated during render.
  const offsets: number[] = [];
  slices.reduce((cumulativePercent, slice) => {
    offsets.push(cumulativePercent);
    return cumulativePercent + slice.percent;
  }, 0);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={t('knapsack.volumeByCategory')}>
        <g transform="rotate(-90 80 80)">
          {slices.map((slice, i) => {
            const dash = (slice.percent / 100) * CIRCUMFERENCE;
            const offset = (offsets[i] / 100) * CIRCUMFERENCE;
            return (
              <circle
                key={slice.category}
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {slices.map((slice, i) => (
          <li key={slice.category} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <span
              aria-hidden="true"
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
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
