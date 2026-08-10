import { VolumeBreakdownSlice } from './volumeBreakdown';

// Pure geometry layer for the 3D suitcase packing view. Consumes
// computeVolumeBreakdown()'s output as-is -- it never recomputes a cm3
// figure, only turns an existing breakdown plus a suitcase's L x W x H into
// stacked 3D box sizes/positions. See "Explain the Arithmetic Without
// Re-implementing It" in .agents/AGENTS.md §6.

export interface SuitcaseDimensionsCm {
  l: number;
  w: number;
  h: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface VolumeBlock {
  category: string;
  colorIndex: number;
  percent: number;
  volumeCm3: number;
  // Box dimensions in cm.
  size: Vec3;
  // Box center position in cm, relative to the suitcase's own center
  // (the suitcase spans -l/2..l/2, -w/2..w/2, -h/2..h/2).
  position: Vec3;
}

export interface VolumeBlockLayout {
  // The suitcase's own bounding-box size, mapped x=length, y=height,
  // z=width -- "up" is the suitcase's height axis.
  suitcaseSize: Vec3;
  blocks: VolumeBlock[];
  // Total packed volume / suitcase volume. Not clamped, so callers can
  // report exactly how far over capacity a pack is.
  usedFraction: number;
  overCapacity: boolean;
}

export function computeVolumeBlocks(
  slices: VolumeBreakdownSlice[],
  suitcase: SuitcaseDimensionsCm
): VolumeBlockLayout {
  const suitcaseVolumeCm3 = suitcase.l * suitcase.w * suitcase.h;
  const suitcaseSize: Vec3 = { x: suitcase.l, y: suitcase.h, z: suitcase.w };

  if (slices.length === 0 || suitcaseVolumeCm3 <= 0) {
    return { suitcaseSize, blocks: [], usedFraction: 0, overCapacity: false };
  }

  const totalPackedVolumeCm3 = slices.reduce((sum, slice) => sum + slice.volumeCm3, 0);
  const usedFraction = totalPackedVolumeCm3 / suitcaseVolumeCm3;
  const clampedFraction = Math.min(1, usedFraction);
  // The rendered stack never exceeds the suitcase's own height, even when
  // the pack is over capacity -- overCapacity carries that fact instead.
  const stackHeightCm = suitcase.h * clampedFraction;

  let cumulativeHeightCm = 0;
  const blocks: VolumeBlock[] = slices.map((slice, index) => {
    const layerHeightCm = (slice.percent / 100) * stackHeightCm;
    const layerCenterY = cumulativeHeightCm + layerHeightCm / 2 - suitcase.h / 2;
    cumulativeHeightCm += layerHeightCm;
    return {
      category: slice.category,
      colorIndex: index,
      percent: slice.percent,
      volumeCm3: slice.volumeCm3,
      size: { x: suitcase.l, y: layerHeightCm, z: suitcase.w },
      position: { x: 0, y: layerCenterY, z: 0 },
    };
  });

  return { suitcaseSize, blocks, usedFraction, overCapacity: usedFraction > 1 };
}
