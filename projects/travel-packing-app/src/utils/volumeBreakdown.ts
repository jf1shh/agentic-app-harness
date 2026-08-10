import { Garment } from '../types';

export interface VolumeBreakdownSlice {
  category: string;
  volumeCm3: number;
  itemCount: number;
  percent: number;
}

// Single shared palette for every packed-volume-by-category visualization
// (the 2D donut chart and the 3D suitcase view) -- one array so the two
// views can never assign a different color to the same category.
export const SLICE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#eab308', '#8b5cf6', '#ef4444'];

export function computeVolumeBreakdown(garments: Garment[]): VolumeBreakdownSlice[] {
  const totalVolumeCm3 = garments.reduce((sum, g) => sum + (g.volumeCm3 || 0), 0);
  if (totalVolumeCm3 <= 0) return [];

  const byCategory = new Map<string, { volumeCm3: number; itemCount: number }>();
  garments.forEach((g) => {
    const entry = byCategory.get(g.category) || { volumeCm3: 0, itemCount: 0 };
    entry.volumeCm3 += g.volumeCm3 || 0;
    entry.itemCount += 1;
    byCategory.set(g.category, entry);
  });

  return Array.from(byCategory.entries())
    .map(([category, { volumeCm3, itemCount }]) => ({
      category,
      volumeCm3,
      itemCount,
      percent: (volumeCm3 / totalVolumeCm3) * 100,
    }))
    .sort((a, b) => b.volumeCm3 - a.volumeCm3);
}
