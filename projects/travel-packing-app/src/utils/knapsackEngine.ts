import { Garment, WearabilityReport } from '../types';
import { checkBaggageCompliance, lookupAirline } from './airlineBaggage';
import { SuitcaseModel } from './suitcaseDatabase';

export interface PackingPhysicsReport {
  totalWeightKg: number;
  totalVolumeLiters: number;
  suitcaseCapacityLiters: number;
  volumeUsedPercent: number;
  airlineCompliant: boolean;
  airlineWarnings: string[];
  fitsInSuitcase: boolean;
  weightLimitKg?: number;
}

export function calculateKnapsackPhysics(
  report: WearabilityReport,
  garments: Garment[],
  suitcase: SuitcaseModel,
  airlineCode: string
): PackingPhysicsReport {
  // Find all unique garments actually scheduled in the outfits
  const packedGarmentIds = new Set<string>();
  report.scheduledOutfits.forEach(({ outfit }) => {
    packedGarmentIds.add(outfit.top.id);
    packedGarmentIds.add(outfit.bottom.id);
    if (outfit.topper) packedGarmentIds.add(outfit.topper.id);
  });

  const packedGarments = garments.filter(g => packedGarmentIds.has(g.id));

  // Calculate physics
  let totalWeightGrams = 0;
  let totalVolumeCm3 = 0;
  packedGarments.forEach(g => {
    totalWeightGrams += g.weightGrams || 0;
    totalVolumeCm3 += g.volumeCm3 || 0;
  });

  const totalWeightKg = totalWeightGrams / 1000;
  const totalVolumeLiters = totalVolumeCm3 / 1000;

  // Suitcase volume (L x W x H in cm = cm3 / 1000 = Liters)
  const suitcaseCapacityLiters = (suitcase.l * suitcase.w * suitcase.h) / 1000;
  const volumeUsedPercent = (totalVolumeLiters / suitcaseCapacityLiters) * 100;

  // Check airline compliance
  const compliance = checkBaggageCompliance(suitcase, airlineCode);
  const airline = lookupAirline(airlineCode);
  const weightLimitKg = airline?.carryOn?.weight || 0;

  let fitsInSuitcase = volumeUsedPercent <= 100;
  if (weightLimitKg > 0 && totalWeightKg > weightLimitKg) {
    compliance.warnings.push(`Weight: ${totalWeightKg.toFixed(1)}kg exceeds ${weightLimitKg}kg limit`);
    fitsInSuitcase = false;
  }

  return {
    totalWeightKg,
    totalVolumeLiters,
    suitcaseCapacityLiters,
    volumeUsedPercent,
    airlineCompliant: compliance.compliant,
    airlineWarnings: compliance.warnings,
    fitsInSuitcase,
    weightLimitKg
  };
}
