import { Garment } from '../types';

export interface VolumeBreakdownSlice {
  category: string;
  volumeCm3: number;
  itemCount: number;
  percent: number;
}

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
