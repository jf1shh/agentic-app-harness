import { z } from 'zod';

export const SourceRatingSchema = z.object({
  rating: z.number(),
  reviewCount: z.number(),
});

export const MichelinInfoSchema = z.object({
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  bibGourmand: z.boolean().optional(),
  recommended: z.boolean().optional(),
  description: z.string().optional(),
});

export const ReviewCommentSchema = z.object({
  id: z.string(),
  source: z.enum(['Google', 'Yelp', 'TripAdvisor', 'OpenTable']),
  author: z.string(),
  rating: z.number(),
  date: z.string(),
  commentText: z.string(),
  detectedMoods: z.array(z.string()),
});

export const AggregateScoreSchema = z.object({
  compositeScore: z.number(),
  google: SourceRatingSchema,
  yelp: SourceRatingSchema,
  tripAdvisor: SourceRatingSchema.optional(),
  michelin: MichelinInfoSchema.optional(),
  infatuationScore: z.number().optional(),
  openTable: SourceRatingSchema.optional(),
  sentimentSummary: z.string(),
  reviewComments: z.array(ReviewCommentSchema).optional(),
});

export const OpeningHourRangeSchema = z.object({
  openHour: z.number(),
  closeHour: z.number(),
});

export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.enum(['Appetizers', 'Mains', 'Desserts', 'Drinks', 'Specials']),
  dietary: z.array(z.enum(['Vegan', 'Vegetarian', 'Gluten-Free', 'Nut-Free'])).optional(),
  isColdDish: z.boolean().optional(),
  isHotDish: z.boolean().optional(),
});

export const BusyHourSlotSchema = z.object({
  hour: z.number(),
  occupancyPercent: z.number(),
  label: z.string(),
  vibe: z.enum(['Quiet & Intimate', 'Moderate', 'Peak & Lively']),
});

// A restaurant read back from localStorage (custom-added rows, per the
// "Authentic Real-World Datasets" lesson in .agents/AGENTS.md §6) is
// untrusted input by the time it's read back (§1) — websiteUrl in particular
// is rendered directly as an <a href>, so the contract restricts it to an
// actual http(s) URL rather than any string, which would otherwise admit a
// `javascript:` URI stored via a hand-edited localStorage payload.
const HTTP_URL_MESSAGE = 'websiteUrl must be an http or https URL';
const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  cuisine: z.string(),
  occasions: z.array(z.string()),
  moods: z.array(z.string()),
  aggregateScore: AggregateScoreSchema,
  websiteUrl: z.string().refine(isHttpUrl, { message: HTTP_URL_MESSAGE }),
  verifiedWebsiteStatus: z.enum(['Verified Open', 'Closed Now', 'Website Check Pending']),
  openingHours: z.record(z.string(), OpeningHourRangeSchema),
  menu: z.array(MenuItemSchema),
  busyHours: z.array(BusyHourSlotSchema),
  address: z.string(),
  distanceMiles: z.number(),
  walkTimeMinutes: z.number(),
  driveTimeMinutes: z.number(),
  outdoorSeating: z.boolean(),
  hasFireplace: z.boolean(),
  heroImage: z.string(),
  priceRange: z.enum(['$$', '$$$', '$$$$']),
  isRealWorldVerified: z.boolean().optional(),
});

export const WeatherStateSchema = z.object({
  tempF: z.number(),
  condition: z.enum(['Sunny', 'Rainy', 'Snowy', 'Clear Night', 'Hot Summer']),
  label: z.string(),
  humidityPercent: z.number(),
});

// The contract for the booking-confirmation flow's persisted reservations
// (src/types/index.ts's Reservation interface, round-tripped through
// localStorage by src/lib/storage.ts). Distinct from BookingDetailsSchema
// below, which is a different, currently-unused shape.
export const ReservationSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  restaurantName: z.string(),
  date: z.string(),
  time: z.string(),
  partySize: z.number(),
  occasion: z.string(),
  specialRequests: z.string(),
  seatingPreference: z.enum(['Indoor', 'Outdoor', 'Window', 'Booth']),
  status: z.enum(['Confirmed', 'Cancelled']),
  createdAt: z.string(),
});

export const BookingDetailsSchema = z.object({
  id: z.string(),
  restaurantId: z.string(),
  restaurantName: z.string(),
  date: z.string(),
  time: z.string(),
  guests: z.number(),
  specialRequest: z.string().optional(),
  createdAt: z.string(),
});

export type SourceRating = z.infer<typeof SourceRatingSchema>;
export type MichelinInfo = z.infer<typeof MichelinInfoSchema>;
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
export type AggregateScore = z.infer<typeof AggregateScoreSchema>;
export type OpeningHourRange = z.infer<typeof OpeningHourRangeSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type BusyHourSlot = z.infer<typeof BusyHourSlotSchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type WeatherState = z.infer<typeof WeatherStateSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type BookingDetails = z.infer<typeof BookingDetailsSchema>;
