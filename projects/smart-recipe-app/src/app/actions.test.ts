import { it, expect, beforeEach, vi } from 'vitest';
import { addInventoryItem, deleteInventoryItem, getInventory, addMealPlanEntry, deleteMealPlanEntry, getMealPlan } from './actions';
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
it('Given a new inventory item, When it is added and removed, Then use the same persisted identity', async () => {
  const form = new FormData(); form.set('name', 'Review Tomato'); form.set('category', 'fridge');
  const item = await addInventoryItem(form);
  expect(item?.id).toBeTruthy();
  expect((await getInventory()).find((row) => row.name === 'Review Tomato')?.id).toBe(item?.id);
  await deleteInventoryItem(item!.id);
  expect((await getInventory()).some((row) => row.name === 'Review Tomato')).toBe(false);
});
it('Given a new planned meal, When it is added and removed, Then use the same persisted identity', async () => {
  const entry = await addMealPlanEntry('2026-09-06', 'classic-pesto-pasta.md', 'Dinner');
  expect(entry?.id).toBeTruthy();
  await deleteMealPlanEntry(entry!.id);
  expect((await getMealPlan()).some((row) => row.id === entry!.id)).toBe(false);
});
it('Given blocked writes, When adding inventory, Then report failure and preserve existing records', async () => {
  const before = await getInventory();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const form = new FormData(); form.set('name', 'Lost Tomato'); form.set('category', 'fridge');
  expect(await addInventoryItem(form)).toBeNull();
  expect(await getInventory()).toEqual(before);
});
