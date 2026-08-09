import { z } from 'zod';

// Contract-first runtime schemas. The TypeScript interfaces in ./types are
// inferred from these (z.infer) so the compile-time and runtime contracts stay
// in lockstep. fileImporter validates user-uploaded closet data against
// GarmentSchema before the wardrobe engine ever sees it.

export const GarmentRoleSchema = z.enum(['top', 'bottom', 'topper', 'layer']);

export const GarmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  roles: z.array(GarmentRoleSchema),
  colors: z.array(z.string()),
  warmth: z.number(),
  exclusionTags: z.array(z.string()),
  weightGrams: z.number(),
  volumeCm3: z.number(),
  time: z.enum(['day', 'evening']).optional(),
});

export const OutfitSchema = z.object({
  id: z.string(),
  top: GarmentSchema,
  bottom: GarmentSchema,
  topper: GarmentSchema.optional(),
  totalWarmth: z.number(),
});

export const DayItinerarySchema = z.object({
  dayNumber: z.number(),
  weatherWarmthTarget: z.number(),
  activity: z.string(),
  maxTempC: z.number().optional(),
  destinationName: z.string().optional(),
});

export const WearabilityReportSchema = z.object({
  flexibilityScore: z.number(),
  mvpItemId: z.string().nullable(),
  deadWeightIds: z.array(z.string()),
  scheduledOutfits: z.array(z.object({ day: z.number(), outfit: OutfitSchema })),
  swapSuggestion: z
    .object({
      removeId: z.string(),
      suggestion: z.string(),
      reason: z.string(),
    })
    .optional(),
});

export type Garment = z.infer<typeof GarmentSchema>;
export type Outfit = z.infer<typeof OutfitSchema>;
export type DayItinerary = z.infer<typeof DayItinerarySchema>;
export type WearabilityReport = z.infer<typeof WearabilityReportSchema>;

// A share link is attacker-controllable input (anyone can hand-edit the URL
// fragment), so it is validated at this boundary the same way file-imported
// or IndexedDB-loaded data already is elsewhere in this app.
export const TripShareSchema = z.object({
  destination: z.string().max(200),
  additionalDestinations: z.array(z.string().max(200)).max(9).optional(),
  startDate: z.string().max(20),
  endDate: z.string().max(20),
  archetype: z.string().max(50),
  strategy: z.string().max(50),
  activity: z.string().max(50),
  closetSource: z.enum(['archetype', 'custom']),
  customGarments: z.array(GarmentSchema).max(300).optional(),
  selectedSuitcase: z.string().max(100),
  selectedAirline: z.string().max(10),
});

export type TripShareState = z.infer<typeof TripShareSchema>;
