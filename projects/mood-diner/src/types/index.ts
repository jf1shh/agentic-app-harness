export interface ReviewSource {
  rating: number; // e.g. 4.8
  reviewCount: number; // e.g. 1420
}

export interface AggregateScore {
  compositeScore: number; // 0 - 5.0 scale
  google: ReviewSource;
  yelp: ReviewSource;
  sentimentSummary: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Appetizers' | 'Mains' | 'Desserts' | 'Drinks' | 'Specials';
  dietary?: ('Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Nut-Free')[];
  isHotDish?: boolean;
  isColdDish?: boolean;
}

export interface BusyHourData {
  hour: number;
  occupancyPercent: number;
  label: string;
  vibe: 'Quiet & Intimate' | 'Moderate' | 'Peak & Lively';
}

export interface OpeningHourRange {
  openHour: number;
  closeHour: number;
}

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  occasions: string[];
  moods: string[];
  aggregateScore: AggregateScore;
  websiteUrl: string;
  verifiedWebsiteStatus: 'Verified Open' | 'Closed Now' | 'Website Check Pending';
  openingHours: { [day: string]: OpeningHourRange };
  menu: MenuItem[];
  busyHours: BusyHourData[];
  address: string;
  distanceMiles: number;
  walkTimeMinutes: number;
  driveTimeMinutes: number;
  outdoorSeating: boolean;
  hasFireplace: boolean;
  heroImage: string;
  priceRange: '$$' | '$$$' | '$$$$';
  isRealWorldVerified?: boolean;
}

export type Season = 'Summer' | 'Winter' | 'Spring' | 'Fall';
export type WeatherConditionType = 'Sunny' | 'Hot' | 'Rainy' | 'Cold' | 'Snowy' | 'Mild';

export interface WeatherCondition {
  temperatureF: number;
  condition: WeatherConditionType;
  season: Season;
  summary: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  occasion: string;
  specialRequests: string;
  seatingPreference: 'Indoor' | 'Outdoor' | 'Window' | 'Booth';
  status: 'Confirmed' | 'Cancelled';
  createdAt: string;
}

export type TransportMode = 'All' | 'Walking' | 'Driving';
