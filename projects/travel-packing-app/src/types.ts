export interface Garment {
  id: string;
  name: string; // e.g., "White Linen Buttondown"
  category: string; 
  roles: ('top' | 'bottom' | 'topper' | 'layer')[];
  colors: string[];
  warmth: number; // 1 (Silk) to 10 (Heavy Wool)
  exclusionTags: string[]; // e.g., ['clash_navy', 'formal_only']
  weightGrams: number;
  volumeCm3: number;
  time?: 'day' | 'evening';
}

export interface Outfit {
  id: string;
  top: Garment;
  bottom: Garment;
  topper?: Garment;
  totalWarmth: number;
}

export interface DayItinerary {
  dayNumber: number;
  weatherWarmthTarget: number; // Max warmth allowed for hot days, Min for cold days
  activity: string; // e.g., "sightseeing", "transit"
  maxTempC?: number; // Optional actual temperature for UI display
}

export interface WearabilityReport {
  flexibilityScore: number;
  mvpItemId: string | null;
  deadWeightIds: string[];
  scheduledOutfits: { day: number; outfit: Outfit }[];
  swapSuggestion?: {
    removeId: string;
    suggestion: string;
    reason: string;
  };
}
