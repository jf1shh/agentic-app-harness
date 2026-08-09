import { Garment } from '../types';
import { GarmentSchema, GarmentRoleSchema } from '../schemas';
import { getThermalValue } from './generator';
import { z } from 'zod';

export interface ManualGarmentInput {
  name: string;
  role: z.infer<typeof GarmentRoleSchema>;
  color: string;
  isEvening: boolean;
}

// Backs the Digital Closet UI (WardrobeManager): builds a schema-valid
// Garment from a manually entered item so a hand-assembled object never
// reaches the wardrobe/knapsack engines without going through the same
// runtime contract every other Garment source (archetype generator, file
// importer) already validates against.
export function buildManualGarment(input: ManualGarmentInput, id: string): Garment {
  const isBulky = input.role === 'bottom' || input.role === 'topper';
  const name = input.name.trim();

  const garment: Garment = {
    id,
    name,
    category: input.role,
    roles: [input.role],
    colors: [input.color],
    warmth: getThermalValue(name),
    exclusionTags: [],
    weightGrams: isBulky ? 500 : 200,
    volumeCm3: isBulky ? 1500 : 600,
    time: input.isEvening ? 'evening' : 'day',
  };

  return GarmentSchema.parse(garment);
}
