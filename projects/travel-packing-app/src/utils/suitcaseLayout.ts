import { Garment } from '../types';

export interface SuitcaseLayoutTile {
  garmentId: string;
  name: string;
  category: string;
  volumeCm3: number;
  position: number;
}

/**
 * Builds the ordered list of tiles SuitcaseLayout renders, from the packed
 * garment set (the same set `getPackedGarments` in `knapsackEngine.ts`
 * already derives) and a user-defined priority order (an array of garment
 * ids, most-important-first). This module only *orders* that existing
 * data -- it never recomputes weight or volume, per the "Explain the
 * Arithmetic Without Re-implementing It" lesson in .agents/AGENTS.md §6.
 *
 * `order` may be stale relative to `garments`: a garment referenced in
 * `order` that is no longer packed is dropped, and a packed garment
 * missing from `order` (e.g. a fresh analysis, or a newly-added item) is
 * appended at the end in its original array order, so a layout is never
 * silently short one tile and never invents a tile with no backing
 * garment.
 */
export function buildSuitcaseLayout(garments: Garment[], order: string[]): SuitcaseLayoutTile[] {
  const byId = new Map(garments.map((g) => [g.id, g]));
  const seen = new Set<string>();
  const ordered: Garment[] = [];

  order.forEach((id) => {
    const garment = byId.get(id);
    if (garment && !seen.has(id)) {
      seen.add(id);
      ordered.push(garment);
    }
  });

  garments.forEach((garment) => {
    if (!seen.has(garment.id)) {
      seen.add(garment.id);
      ordered.push(garment);
    }
  });

  return ordered.map((garment, position) => ({
    garmentId: garment.id,
    name: garment.name,
    category: garment.category,
    volumeCm3: garment.volumeCm3 || 0,
    position,
  }));
}

/**
 * Moves `activeId` to sit at `overId`'s current position in `order`,
 * shifting every id between the two by one. Pure array move -- this app
 * has no @dnd-kit/sortable dependency, and SuitcaseLayout only ever
 * reorders along one axis, so a small hand-rolled move is enough.
 *
 * Purely decorative reordering: unlike the Outfit Editor's
 * `findValidSwap`, there is no combination to validate here, so unlike
 * that module this one never returns null for a "rejected" drop -- an
 * unknown activeId or overId simply leaves the order unchanged, since
 * there is nothing sensible to move.
 */
export function reorderSuitcaseLayout(order: string[], activeId: string, overId: string): string[] {
  if (activeId === overId) return order;

  const fromIndex = order.indexOf(activeId);
  const toIndex = order.indexOf(overId);
  if (fromIndex === -1 || toIndex === -1) return order;

  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
