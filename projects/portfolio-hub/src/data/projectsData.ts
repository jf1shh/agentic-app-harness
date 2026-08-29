import { ProjectItem, ProjectItemSchema } from '../schemas';

const RAW_PROJECTS: ProjectItem[] = [
  {
    id: 'legal-financial-rag',
    name: 'LexiVault Financial RAG',
    tagline: '100% Private Client-Side Legal RAG & Security Engine',
    description: 'Hybrid BM25 + vector retrieval over encrypted contracts — zero telemetry, nothing leaves the device.',
    category: 'Legal',
    techStack: ['React', 'Vite', 'TypeScript', 'Vitest', 'Playwright', 'Axe-Core', 'WebCrypto', 'PWA'],
    metrics: {
      unitTests: 19,
      e2eTests: 7,
      a11yScore: '100% WCAG 2.0 AA',
      securityAudit: '0 High Vulnerabilities',
    },
    pwaReady: true,
    capacitorAndroid: true,
    monetized: true,
    specPath: 'specs/legal-financial-rag-spec.md',
    demoUrl: 'https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/',
    githubUrl: 'https://github.com/jf1shh/agentic-app-harness/tree/master/projects/legal-financial-rag',
    snippet: {
      language: 'typescript',
      sourcePath: 'projects/legal-financial-rag/src/lib/security/encryption.ts',
      code: `export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltHex?: string
): Promise<{ key: CryptoKey; saltHex: string }> {
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
  );

  // Node 20 WebCrypto rejects a TypedArray's raw .buffer as BufferSource —
  // a fresh Uint8Array copy is required for cross-runtime compatibility.
  const saltBuffer = new Uint8Array(saltBytes);

  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
    passphraseKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
}`,
    },
    mlArchitecture: {
      approach: 'Hybrid BM25 lexical + cosine-similarity vector retrieval, 100% client-side and fully offline — no inference server, no network call',
      pipeline: [
        { label: 'Clause-preserving chunker splits documents into retrievable units without cutting a legal clause mid-sentence', sourcePath: 'projects/legal-financial-rag/src/lib/rag/chunker.ts' },
        { label: 'BM25 (k1=1.5, b=0.75) blended with cosine similarity over local embeddings via a tunable hybridWeight', sourcePath: 'projects/legal-financial-rag/src/lib/rag/vectorEngine.ts' },
        { label: 'Query processor resolves top-K citations, synthesizes a grounded answer, and stamps the result with a SHA-256 audit hash', sourcePath: 'projects/legal-financial-rag/src/lib/rag/queryProcessor.ts' },
      ],
      evalMethod: 'promptfoo retrieval-precision eval against a golden query set — gates CI on precision@K ≥ 90% and MRR ≥ 0.75, deterministic and LLM-free',
    },
  },
  {
    id: 'mood-diner',
    name: 'MoodDiner',
    tagline: 'Weather-Aware Restaurant Recommender & Instant Table Booking Engine',
    description: 'Blends live review scores, open-now checks, and real weather into one instant recommendation.',
    category: 'Dining',
    techStack: ['React', 'Vite', 'TypeScript', 'Vitest', 'Playwright', 'Axe-Core', 'Capacitor Android', 'PWA'],
    metrics: {
      unitTests: 8,
      e2eTests: 4,
      a11yScore: '100% WCAG 2.0 AA',
      securityAudit: '0 High Vulnerabilities',
    },
    pwaReady: true,
    capacitorAndroid: true,
    monetized: true,
    specPath: 'specs/mood-diner-spec.md',
    demoUrl: 'https://jf1shh.github.io/agentic-app-harness/mood-diner/',
    githubUrl: 'https://github.com/jf1shh/agentic-app-harness/tree/master/projects/mood-diner',
    snippet: {
      language: 'typescript',
      sourcePath: 'projects/mood-diner/src/utils/weatherEngine.ts',
      code: `export function evaluateWeatherSuitability(
  restaurant: Restaurant,
  weather: WeatherCondition
): WeatherRecommendationResult {
  let score = 80; // Baseline match
  const isHot = weather.temperatureF >= 80 || weather.condition === 'Hot';

  const hotDishes = restaurant.menu.filter((item) => item.isHotDish);
  const hotDishRatio = hotDishes.length / (restaurant.menu.length || 1);

  if (isHot) {
    if (hotDishRatio >= 0.5) {
      score -= 35; // Hot soups/stews discouraged in summer heat
      isWeatherDiscouraged = true;
    } else if (coldDishes.length > 0) {
      score += 15;
    }
  }
  // ...cold/rainy adjustments follow the same shape
  return { weatherMatchScore: score, weatherNote, isWeatherDiscouraged, suggestedMenuItems };
}`,
    },
  },
  {
    id: 'travel-packing-app',
    name: 'Travel Packing App',
    tagline: 'Smart Wardrobe & Knapsack Weight-Optimized Packing Assistant',
    description: 'Knapsack-optimized packing lists from real weather, airline limits, and a color-match matrix.',
    category: 'Utility',
    techStack: ['Next.js', 'React', 'TypeScript', 'Vitest', 'Playwright', 'Axe-Core', 'PWA'],
    metrics: {
      unitTests: 12,
      e2eTests: 5,
      a11yScore: '100% WCAG 2.0 AA',
      securityAudit: '0 High Vulnerabilities',
    },
    pwaReady: true,
    capacitorAndroid: true,
    monetized: true,
    specPath: 'specs/travel-packing-app-spec.md',
    demoUrl: 'https://jf1shh.github.io/agentic-app-harness/travel-packing-app/',
    githubUrl: 'https://github.com/jf1shh/agentic-app-harness/tree/master/projects/travel-packing-app',
    snippet: {
      language: 'typescript',
      sourcePath: 'projects/travel-packing-app/src/utils/knapsackEngine.ts',
      code: `export function calculateKnapsackPhysics(
  report: WearabilityReport,
  garments: Garment[],
  suitcase: SuitcaseModel,
  airlineCode: string
): PackingPhysicsReport {
  // Only the garments actually scheduled into an outfit count toward weight
  const packedGarmentIds = new Set<string>();
  report.scheduledOutfits.forEach(({ outfit }) => {
    packedGarmentIds.add(outfit.top.id);
    packedGarmentIds.add(outfit.bottom.id);
  });
  const packedGarments = garments.filter((g) => packedGarmentIds.has(g.id));

  const totalWeightKg = packedGarments.reduce((sum, g) => sum + (g.weightGrams || 0), 0) / 1000;
  const suitcaseCapacityLiters = (suitcase.l * suitcase.w * suitcase.h) / 1000;
  const volumeUsedPercent = (totalVolumeLiters / suitcaseCapacityLiters) * 100;

  return checkBaggageCompliance({ totalWeightKg, volumeUsedPercent, ... }, lookupAirline(airlineCode));
}`,
    },
  },
  {
    id: 'smart-recipe-app',
    name: 'Smart Kitchen Recipe Manager',
    tagline: 'AI Ingredient-Matching, Meal Planner & Shopping List Generator',
    description: 'Turns whatever is in your pantry into a meal plan, macro breakdown, and a shopping list.',
    category: 'Kitchen',
    techStack: ['Next.js', 'React', 'TypeScript', 'Vitest', 'Playwright', 'Axe-Core', 'PWA'],
    metrics: {
      unitTests: 6,
      e2eTests: 3,
      a11yScore: '100% WCAG 2.0 AA',
      securityAudit: '0 High Vulnerabilities',
    },
    pwaReady: true,
    capacitorAndroid: false,
    monetized: false,
    specPath: 'specs/smart-recipe-app.md',
    demoUrl: 'https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/',
    githubUrl: 'https://github.com/jf1shh/agentic-app-harness/tree/master/projects/smart-recipe-app',
    snippet: {
      language: 'typescript',
      sourcePath: 'projects/smart-recipe-app/src/lib/recommend.ts',
      code: `/**
 * Rank recipes by how many of their ingredients the current inventory covers.
 * Ties break toward the quicker recipe, then alphabetically for stability.
 * Recipes with zero matches are omitted — a recommendation you can't cook for
 * isn't a recommendation.
 */
export function recommendRecipes(inventory: InventoryItem[], recipes: RecipeEntry[]): RecipeRecommendation[] {
  const pantryTokens = new Set(inventory.flatMap((i) => tokenize(i.name)));

  const recs = recipes.map((recipe) => {
    const ingredients = parseIngredients(recipe.content);
    const matched = ingredients.filter((ing) => tokenize(ing).some((t) => pantryTokens.has(t)));
    return { title: titleOf(recipe), matchCount: matched.length, matchRatio: matched.length / (ingredients.length || 1) };
  });

  return recs
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount || a.title.localeCompare(b.title));
}`,
    },
    mlArchitecture: {
      approach: 'Build-time local sentence-embedding index over the recipe corpus using a real transformer model, no inference server in the loop',
      pipeline: [
        { label: 'Corpus embedded offline with Xenova/all-MiniLM-L6-v2 via @huggingface/transformers, vectors L2-normalized', sourcePath: 'projects/smart-recipe-app/embed-corpus.mjs' },
        { label: 'Precomputed index shipped as a static asset and re-derived any time the corpus changes (npm run embed)', sourcePath: 'projects/smart-recipe-app/src/lib/rag/corpus.json' },
        { label: 'Shipped index and corpus are both validated against a Zod contract at test time so the artifact can never silently drift from its source', sourcePath: 'projects/smart-recipe-app/src/lib/rag/schemas.ts' },
      ],
    },
  },
  {
    id: 'elder-care-planner',
    name: 'Elder Care Cost Planner',
    tagline: 'What Care Really Costs, How Long the Money Lasts, and How a Family Shares It',
    description: 'Models true cost, funding runway, and a fair family split — fully offline, no referral revenue.',
    category: 'Family Finance',
    techStack: ['Next.js', 'React', 'TypeScript', 'Zod', 'Vitest', 'Playwright', 'Axe-Core'],
    metrics: {
      unitTests: 237,
      e2eTests: 70,
      a11yScore: '100% WCAG 2.1 AA',
      securityAudit: '0 High Vulnerabilities',
    },
    pwaReady: false,
    capacitorAndroid: false,
    monetized: false,
    specPath: 'specs/elder-care-planner-spec.md',
    demoUrl: 'https://jf1shh.github.io/agentic-app-harness/elder-care-planner/',
    githubUrl: 'https://github.com/jf1shh/agentic-app-harness/tree/master/projects/elder-care-planner',
    snippet: {
      language: 'typescript',
      sourcePath: 'projects/elder-care-planner/src/lib/engine/breakeven.ts',
      code: `export function computeBreakEven(input: BreakEvenInput): BreakEvenResult {
  const fixed = input.housingCarryMonthlyCents + input.inHomeAncillaryMonthlyCents;
  const residentialMonthly = input.residentialAllInMonthlyCents;
  const costPerHourPerMonth = input.hourlyRateCents * WEEKS_PER_MONTH;

  // Residential is cheaper even at zero paid hours: the crossover is 0, not
  // a negative hour count.
  const residentialAlwaysCheaper = residentialMonthly <= fixed;

  let breakEvenHoursPerWeek: number;
  if (costPerHourPerMonth <= 0) {
    // Free help never crosses over — reported as unbounded, never divided by zero.
    breakEvenHoursPerWeek = residentialAlwaysCheaper ? 0 : Number.POSITIVE_INFINITY;
  } else if (residentialAlwaysCheaper) {
    breakEvenHoursPerWeek = 0;
  } else {
    breakEvenHoursPerWeek = (residentialMonthly - fixed) / costPerHourPerMonth;
  }
  return { breakEvenHoursPerWeek, residentialAlwaysCheaper, /* ... */ };
}`,
    },
  },
];

export const PROJECTS_DATA: ProjectItem[] = RAW_PROJECTS.map(item => ProjectItemSchema.parse(item));
export type { ProjectItem };
