import { z } from 'zod';

export const SourceRatingSchema = z.object({
  rating: z.number(),
  reviewCount: z.number(),
});

export const MichelinInfoSchema = z.object({
  stars: z.number(),
  description: z.string(),
});

export const ReviewCommentSchema = z.object({
  id: z.string(),
  source: z.string(),
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
  tripAdvisor: SourceRatingSchema,
  michelin: MichelinInfoSchema.optional(),
  infatuationScore: z.number().optional(),
  openTable: SourceRatingSchema.optional(),
  sentimentSummary: z.string(),
  reviewComments: z.array(ReviewCommentSchema),
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
  category: z.enum(['Appetizers', 'Mains', 'Desserts', 'Drinks']),
  dietary: z.array(z.string()).optional(),
  isColdDish: z.boolean().optional(),
  isHotDish: z.boolean().optional(),
});

export const BusyHourSlotSchema = z.object({
  hour: z.number(),
  occupancyPercent: z.number(),
  label: z.string(),
  vibe: z.string(),
});

export const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  cuisine: z.string(),
  occasions: z.array(z.string()),
  moods: z.array(z.string()),
  aggregateScore: AggregateScoreSchema,
  websiteUrl: z.string(),
  verifiedWebsiteStatus: z.string(),
  openingHours: z.record(z.string(), OpeningHourRangeSchema),
  menu: z.array(MenuItemSchema),
  busyHours: z.array(BusyHourSlotSchema),
  address: z.string(),
  distanceMiles: z.number(),
  walkTimeMinutes: z.number(),
  driveTimeMinutes: z.number(),
  outdoorSeating: z.boolean(),
  rooftop: z.boolean().optional(),
  fireplace: z.boolean().optional(),
  hasHeaters: z.boolean().optional(),
});

export const WeatherStateSchema = z.object({
  tempF: z.number(),
  condition: z.enum(['Sunny', 'Rainy', 'Snowy', 'Clear Night', 'Hot Summer']),
  label: z.string(),
  humidityPercent: z.number(),
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
export type BookingDetails = z.infer<typeof BookingDetailsSchema>;
