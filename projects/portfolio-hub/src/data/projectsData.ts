export interface ProjectItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'Dining' | 'Utility' | 'Kitchen';
  techStack: string[];
  metrics: {
    unitTests: number;
    e2eTests: number;
    a11yScore: string;
    securityAudit: string;
  };
  pwaReady: boolean;
  capacitorAndroid: boolean;
  monetized: boolean;
  specPath: string;
  demoUrl: string;
  githubUrl: string;
}

export const PROJECTS_DATA: ProjectItem[] = [
  {
    id: 'mood-diner',
    name: 'MoodDiner',
    tagline: 'Weather-Aware Restaurant Recommender & Instant Table Booking Engine',
    description: 'Combines Google & Yelp composite review scores, open status checks, weather-aware cuisine matching (92°F summer suppression vs 35°F stews boost), authentic real-world spot importer, and instant table reservation engine.',
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
  },
  {
    id: 'travel-packing-app',
    name: 'Travel Packing App',
    tagline: 'Smart Wardrobe & Knapsack Weight-Optimized Packing Assistant',
    description: 'Uses mathematical knapsack algorithms, weather forecasting, color compatibility matrix, and background removal to generate optimized travel packing lists adhering to airline carry-on limits.',
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
  },
  {
    id: 'smart-recipe-app',
    name: 'Smart Kitchen Recipe Manager',
    tagline: 'AI Ingredient-Matching, Meal Planner & Shopping List Generator',
    description: 'Pantry inventory tracking, instant meal generation from available ingredients, calorie/macro breakdowns, and automated shopping list generation.',
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
  },
];
