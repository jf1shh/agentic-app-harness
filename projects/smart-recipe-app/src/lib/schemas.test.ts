import { describe, expect, it } from 'vitest';
import { InventoryItemSchema, InventorySchema, MealPlanEntrySchema } from './schemas';

describe('contract-first schemas', () => {
  it('accepts a well-formed inventory item', () => {
    // Given a valid inventory item
    const item = { id: 'inv-1', name: 'Basil', category: 'Herbs', quantity: '1 bunch', addedAt: new Date().toISOString() };
    // When validated against the schema
    const result = InventoryItemSchema.safeParse(item);
    // Then it passes
    expect(result.success).toBe(true);
  });

  it('treats quantity as optional', () => {
    const result = InventoryItemSchema.safeParse({ id: 'i', name: 'Salt', category: 'Pantry', addedAt: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects an item missing required fields', () => {
    // Given a malformed record (missing name/category/addedAt)
    const result = InventoryItemSchema.safeParse({ id: 'i' });
    // Then validation fails, so it never reaches the UI
    expect(result.success).toBe(false);
  });

  it('rejects wrong field types', () => {
    const result = MealPlanEntrySchema.safeParse({ id: 1, date: '2026-01-01', recipeId: 'r', mealType: 'Dinner' });
    expect(result.success).toBe(false);
  });

  it('validates arrays and rejects a non-array payload', () => {
    expect(InventorySchema.safeParse([]).success).toBe(true);
    expect(InventorySchema.safeParse({ not: 'an array' }).success).toBe(false);
  });
});
