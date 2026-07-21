import { Restaurant, WeatherCondition } from '../types';

export const PRESET_WEATHER: WeatherCondition[] = [
  {
    temperatureF: 92,
    condition: 'Hot',
    season: 'Summer',
    summary: 'Sweltering Hot Summer Afternoon (92°F). AI suppresses boiling ramen & hot stews; boosts rooftop patio, sushi, ice cream & chilled cocktails.',
  },
  {
    temperatureF: 35,
    condition: 'Cold',
    season: 'Winter',
    summary: 'Freezing Winter Night (35°F). AI boosts steaming hot soups, bubbling hot pot, steakhouse fireplaces, and warm braises.',
  },
  {
    temperatureF: 52,
    condition: 'Rainy',
    season: 'Fall',
    summary: 'Overcast Rainy Evening (52°F). AI recommends warm indoor bistro comfort dining.',
  },
  {
    temperatureF: 68,
    condition: 'Mild',
    season: 'Spring',
    summary: 'Pleasant Spring Breeze (68°F). All outdoor garden and indoor dining options matched nicely.',
  },
];

export interface WeatherRecommendationResult {
  weatherMatchScore: number; // 0 to 100
  weatherNote: string;
  isWeatherDiscouraged: boolean; // e.g. Hot soup in 95°F summer
  suggestedMenuItems: string[]; // Names of best dishes for current weather
}

export function evaluateWeatherSuitability(
  restaurant: Restaurant,
  weather: WeatherCondition
): WeatherRecommendationResult {
  let score = 80; // Baseline match
  const notes: string[] = [];
  const suggestedMenuItems: string[] = [];
  let isWeatherDiscouraged = false;

  const isHot = weather.temperatureF >= 80 || weather.condition === 'Hot';
  const isCold = weather.temperatureF <= 45 || weather.condition === 'Cold' || weather.condition === 'Snowy';
  const isRainy = weather.condition === 'Rainy';

  // Dish analysis
  const hotDishes = restaurant.menu.filter((item) => item.isHotDish);
  const coldDishes = restaurant.menu.filter((item) => item.isColdDish);
  const totalDishes = restaurant.menu.length || 1;

  const hotDishRatio = hotDishes.length / totalDishes;

  // 1. Hot Summer Weather Adjustments
  if (isHot) {
    if (hotDishRatio >= 0.5) {
      score -= 35;
      isWeatherDiscouraged = true;
      notes.push(`Hot weather (${weather.temperatureF}°F): Hot soups and heavy stews are discouraged in summer heat.`);
    } else if (coldDishes.length > 0) {
      score += 15;
      notes.push(`Ideal summer spot with refreshing chilled options & cold beverages.`);
    }

    if (restaurant.outdoorSeating) {
      score += 10;
      notes.push('Features outdoor seating / patio for summer breeze.');
    }

    coldDishes.forEach((d) => suggestedMenuItems.push(d.name));
  }
  // 2. Cold Winter Weather Adjustments
  else if (isCold) {
    if (hotDishRatio >= 0.4 || restaurant.cuisine.toLowerCase().includes('ramen') || restaurant.cuisine.toLowerCase().includes('hot pot')) {
      score += 20;
      notes.push(`Perfect winter warmth (${weather.temperatureF}°F): Comforting hot soups & hot pot.`);
    }

    if (restaurant.hasFireplace) {
      score += 10;
      notes.push('Features a cozy fireplace.');
    }

    hotDishes.forEach((d) => suggestedMenuItems.push(d.name));
  }
  // 3. Rainy Weather Adjustments
  else if (isRainy) {
    if (restaurant.outdoorSeating && !restaurant.hasFireplace) {
      score -= 10;
      notes.push('Rainy weather: Indoor seating recommended.');
    }
    if (hotDishes.length > 0) {
      score += 10;
      notes.push('Warm comfort dishes for rainy day dining.');
    }
    hotDishes.forEach((d) => suggestedMenuItems.push(d.name));
  } else {
    notes.push(`Pleasant weather (${weather.temperatureF}°F) — great for any dining preference.`);
  }

  // Cap score between 10 and 100
  const finalScore = Math.min(100, Math.max(10, Math.round(score)));

  return {
    weatherMatchScore: finalScore,
    weatherNote: notes.join(' '),
    isWeatherDiscouraged,
    suggestedMenuItems: suggestedMenuItems.slice(0, 3),
  };
}
