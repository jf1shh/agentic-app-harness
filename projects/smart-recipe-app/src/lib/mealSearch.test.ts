import { describe, it, expect, vi } from 'vitest';
import { searchMeals } from './mealSearch';

describe('Given external recipe search data', () => {
  it('When the query contains URL syntax, Then it stays within the search parameter', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meals: null }) });
    expect(await searchMeals('fish & chips#one', fetcher)).toEqual([]);
    expect(fetcher.mock.calls[0][0]).toContain('s=fish%20%26%20chips%23one');
  });
  it('When the provider returns invalid meals, Then reject them before rendering', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meals: [null, { idMeal: '1' }] }) });
    await expect(searchMeals('fish', fetcher)).rejects.toThrow();
  });
  it('When a meal has an unsafe image URL, Then reject it at the boundary', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meals: [{ idMeal: '1', strMeal: 'Fish', strMealThumb: 'javascript:bad()' }] }) });
    await expect(searchMeals('fish', fetcher)).rejects.toThrow();
  });
  it('When a valid meal contains optional null fields, Then normalize them for saving', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meals: [{ idMeal: '1', strMeal: 'Fish', strMealThumb: 'https://www.themealdb.com/images/fish.jpg', strIngredient1: null, strYoutube: '' }] }) });
    expect((await searchMeals('fish', fetcher))[0].strIngredient1).toBe('');
  });
  it('When the provider rejects the request, Then report failure', async () => {
    await expect(searchMeals('fish', vi.fn().mockResolvedValue({ ok: false }))).rejects.toThrow();
  });
});
