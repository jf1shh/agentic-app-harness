import { describe, it, expect } from 'vitest';
import { computeVolumeBlocks } from '../src/utils/volumeBlocks';
import { VolumeBreakdownSlice } from '../src/utils/volumeBreakdown';

// Pure geometry layer on top of computeVolumeBreakdown() (never re-derives a
// cm3 figure -- see the "Explain the Arithmetic Without Re-implementing It"
// lesson in .agents/AGENTS.md §6). This turns an existing volume-by-category
// breakdown plus a suitcase's L x W x H into stacked 3D box sizes/positions
// for the 3D packing view.
describe('computeVolumeBlocks', () => {
  // 40 x 30 x 20 cm suitcase = 24,000 cm3.
  const suitcase = { l: 40, w: 30, h: 20 };

  it('Given two packed categories at 60%/40% share filling half the suitcase, When blocks are computed, Then each is a full-footprint layer stacked bottom-up, sized and centered from the packed fraction of the suitcase height', () => {
    const slices: VolumeBreakdownSlice[] = [
      { category: 'pants', volumeCm3: 7200, itemCount: 2, percent: 60 },
      { category: 'shirt', volumeCm3: 4800, itemCount: 3, percent: 40 },
    ];
    // total packed = 12,000cm3 -> usedFraction = 12000/24000 = 0.5
    // stackHeightCm = 20 * 0.5 = 10; pants layer = 6cm, shirt layer = 4cm.
    const layout = computeVolumeBlocks(slices, suitcase);

    expect(layout.usedFraction).toBeCloseTo(0.5);
    expect(layout.overCapacity).toBe(false);
    expect(layout.suitcaseSize).toEqual({ x: 40, y: 20, z: 30 });
    expect(layout.blocks).toHaveLength(2);

    const [pantsBlock, shirtBlock] = layout.blocks;
    expect(pantsBlock.category).toBe('pants');
    expect(pantsBlock.size).toEqual({ x: 40, y: 6, z: 30 });
    // Layer sits at the bottom of the stack: center = 0 + 6/2 - (20/2) = -7.
    expect(pantsBlock.position).toEqual({ x: 0, y: -7, z: 0 });

    expect(shirtBlock.category).toBe('shirt');
    expect(shirtBlock.size).toEqual({ x: 40, y: 4, z: 30 });
    // Stacked on top of the 6cm pants layer: center = 6 + 4/2 - 10 = -2.
    expect(shirtBlock.position).toEqual({ x: 0, y: -2, z: 0 });

    // The two layers' heights sum to exactly the packed stack height -- no
    // gap and no overlap between categories.
    const totalStackedHeight = layout.blocks.reduce((sum, b) => sum + b.size.y, 0);
    expect(totalStackedHeight).toBeCloseTo(10);
  });

  it('Given a single category filling the entire suitcase, When blocks are computed, Then its layer spans the full height and is centered on the suitcase origin', () => {
    const slices: VolumeBreakdownSlice[] = [
      { category: 'everything', volumeCm3: 24000, itemCount: 5, percent: 100 },
    ];
    const layout = computeVolumeBlocks(slices, suitcase);

    expect(layout.usedFraction).toBeCloseTo(1);
    expect(layout.overCapacity).toBe(false);
    expect(layout.blocks[0].size).toEqual({ x: 40, y: 20, z: 30 });
    expect(layout.blocks[0].position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('Given packed volume that exceeds the suitcase\'s own volume, When blocks are computed, Then the stack is clamped to exactly the suitcase height and overCapacity is reported rather than geometry bursting through the walls', () => {
    const slices: VolumeBreakdownSlice[] = [
      { category: 'everything', volumeCm3: 36000, itemCount: 5, percent: 100 },
    ];
    // usedFraction = 36000/24000 = 1.5 -- unclamped, so callers can still
    // report *how* over capacity the pack is.
    const layout = computeVolumeBlocks(slices, suitcase);

    expect(layout.usedFraction).toBeCloseTo(1.5);
    expect(layout.overCapacity).toBe(true);
    // The rendered stack itself never exceeds the suitcase's own height.
    const totalStackedHeight = layout.blocks.reduce((sum, b) => sum + b.size.y, 0);
    expect(totalStackedHeight).toBeCloseTo(20);
  });

  it('Given no packed garments, When blocks are computed, Then no blocks are returned and the suitcase carries no fill', () => {
    const layout = computeVolumeBlocks([], suitcase);
    expect(layout.blocks).toEqual([]);
    expect(layout.usedFraction).toBe(0);
    expect(layout.overCapacity).toBe(false);
  });

  it('Given a suitcase with a zero dimension, When blocks are computed, Then an empty layout is returned rather than dividing by zero', () => {
    const slices: VolumeBreakdownSlice[] = [
      { category: 'shirt', volumeCm3: 1000, itemCount: 1, percent: 100 },
    ];
    const layout = computeVolumeBlocks(slices, { l: 0, w: 30, h: 20 });
    expect(layout.blocks).toEqual([]);
    expect(layout.usedFraction).toBe(0);
    expect(layout.overCapacity).toBe(false);
    expect(Number.isNaN(layout.usedFraction)).toBe(false);
  });

  it('Given three categories, When blocks are computed, Then each is assigned a stable, order-matching color index for the caller to map to a palette', () => {
    const slices: VolumeBreakdownSlice[] = [
      { category: 'pants', volumeCm3: 4000, itemCount: 1, percent: 40 },
      { category: 'shirt', volumeCm3: 4000, itemCount: 1, percent: 40 },
      { category: 'layer', volumeCm3: 2000, itemCount: 1, percent: 20 },
    ];
    const layout = computeVolumeBlocks(slices, suitcase);
    expect(layout.blocks.map((b) => b.colorIndex)).toEqual([0, 1, 2]);
  });
});
