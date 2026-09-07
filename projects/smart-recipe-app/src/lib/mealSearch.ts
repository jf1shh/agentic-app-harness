import { z } from 'zod';

const SafeUrl = z.string().url().refine((value) => value.startsWith('https://'));
const MealSchema = z.object({
  idMeal: z.string().min(1),
  strMeal: z.string().min(1),
  strMealThumb: SafeUrl,
  strYoutube: z.union([SafeUrl, z.literal(''), z.null()]).optional(),
}).catchall(z.string().nullable());
const SearchResponseSchema = z.object({ meals: z.array(MealSchema).max(100).nullable() });

export async function searchMeals(query: string, fetcher: typeof fetch = fetch): Promise<Record<string, string>[]> {
  const response = await fetcher(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query.trim())}`, {
    signal: AbortSignal.timeout(15000), referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('Recipe search failed');
  const data = SearchResponseSchema.parse(await response.json());
  return (data.meals ?? []).map((meal) => Object.fromEntries(Object.entries(meal).map(([key, value]) => [key, value ?? ''])));
}
