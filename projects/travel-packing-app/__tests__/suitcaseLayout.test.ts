import { describe, it, expect } from 'vitest';
import { buildSuitcaseLayout, reorderSuitcaseLayout } from '../src/utils/suitcaseLayout';
import { Garment } from '../src/types';

describe('buildSuitcaseLayout', () => {
  const garments: Garment[] = [
    { id: 'top1', name: 'T-Shirt', category: 'shirt', roles: ['top'], colors: [], warmth: 2, exclusionTags: [], weightGrams: 200, volumeCm3: 1000 },
    { id: 'bottom1', name: 'Jeans', category: 'pants', roles: ['bottom'], colors: [], warmth: 5, exclusionTags: [], weightGrams: 800, volumeCm3: 4000 },
    { id: 'layer1', name: 'Jacket', category: 'layer', roles: ['topper'], colors: [], warmth: 8, exclusionTags: [], weightGrams: 1000, volumeCm3: 4000 },
  ];

  it('Given a saved priority order covering every packed garment, When the layout is built, Then tiles are returned in that order with position indexes reflecting it, and each tile\'s volume/category are read from the garment rather than recomputed', () => {
    const order = ['layer1', 'top1', 'bottom1'];
    const tiles = buildSuitcaseLayout(garments, order);

    expect(tiles.map(t => t.garmentId)).toEqual(['layer1', 'top1', 'bottom1']);
    expect(tiles.map(t => t.position)).toEqual([0, 1, 2]);
    expect(tiles[0]).toEqual({ garmentId: 'layer1', name: 'Jacket', category: 'layer', volumeCm3: 4000, position: 0 });
  });

  it('Given an order missing a newly packed garment, When the layout is built, Then the missing garment is appended at the end rather than dropped', () => {
    const order = ['bottom1', 'top1']; // layer1 not yet in the saved order
    const tiles = buildSuitcaseLayout(garments, order);

    expect(tiles.map(t => t.garmentId)).toEqual(['bottom1', 'top1', 'layer1']);
  });

  it('Given an order referencing a garment that is no longer packed, When the layout is built, Then the stale id is dropped rather than producing a tile with no backing garment', () => {
    const order = ['top1', 'ghost-id', 'bottom1', 'layer1'];
    const tiles = buildSuitcaseLayout(garments, order);

    expect(tiles.map(t => t.garmentId)).toEqual(['top1', 'bottom1', 'layer1']);
    expect(tiles).toHaveLength(3);
  });

  it('Given an empty order (first render of a fresh analysis), When the layout is built, Then every packed garment appears once, in its original array order', () => {
    const tiles = buildSuitcaseLayout(garments, []);
    expect(tiles.map(t => t.garmentId)).toEqual(['top1', 'bottom1', 'layer1']);
  });
});

describe('reorderSuitcaseLayout', () => {
  it('Given a tile dragged onto a later tile, When reordered, Then the dragged tile moves to sit at the target\'s position and everything between shifts up by one', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(reorderSuitcaseLayout(order, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('Given a tile dragged onto an earlier tile, When reordered, Then the dragged tile moves to sit at the target\'s position and everything between shifts down by one', () => {
    const order = ['a', 'b', 'c', 'd'];
    expect(reorderSuitcaseLayout(order, 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('Given a tile dropped onto itself, When reordered, Then the order is unchanged', () => {
    const order = ['a', 'b', 'c'];
    expect(reorderSuitcaseLayout(order, 'b', 'b')).toEqual(['a', 'b', 'c']);
  });

  it('Given an active or target id that is not present in the order, When reordered, Then the original order is returned unchanged rather than throwing', () => {
    const order = ['a', 'b', 'c'];
    expect(reorderSuitcaseLayout(order, 'ghost', 'b')).toEqual(['a', 'b', 'c']);
    expect(reorderSuitcaseLayout(order, 'a', 'ghost')).toEqual(['a', 'b', 'c']);
  });
});
