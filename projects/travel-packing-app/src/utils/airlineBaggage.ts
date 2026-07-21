export interface BaggagePolicy {
  l: number;
  w: number;
  h: number;
  weight: number;
  note?: string;
}

export interface Airline {
  code: string;
  name: string;
  region: string;
  carryOn: BaggagePolicy;
  personal: BaggagePolicy;
  checked: { weight: number; maxDim: number; note?: string };
  strictCarryOn: boolean;
  carryOnInBasic: boolean;
}

export const AIRLINES: Airline[] = [
  { code: 'FR', name: 'Ryanair', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 20, weight: 10, note: 'Priority & 2 Cabin Bags fare' },
    personal: { l: 40, w: 30, h: 20, weight: 0, note: 'Free on all fares, under-seat only' },
    checked: { weight: 20, maxDim: 158, note: '10kg check-in bag also available' },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'U2', name: 'easyJet', region: 'Europe',
    carryOn: { l: 56, w: 45, h: 25, weight: 15, note: 'Large cabin bag, paid upgrade' },
    personal: { l: 45, w: 36, h: 20, weight: 15, note: 'Free on all fares, under-seat' },
    checked: { weight: 23, maxDim: 275, note: 'Total dims L+W+H ≤ 275cm' },
    strictCarryOn: false, carryOnInBasic: false },
  { code: 'DL', name: 'Delta Air Lines', region: 'North America',
    carryOn: { l: 56, w: 35, h: 23, weight: 0, note: 'No stated weight limit' },
    personal: { l: 40, w: 30, h: 15, weight: 0, note: 'Purse, briefcase, laptop bag' },
    checked: { weight: 23, maxDim: 158, note: 'Basic Economy: no free checked bag' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'UA', name: 'United Airlines', region: 'North America',
    carryOn: { l: 56, w: 35, h: 22, weight: 0, note: 'No stated weight limit' },
    personal: { l: 43, w: 25, h: 22, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: 'Basic Economy: no free checked bag' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'AA', name: 'American Airlines', region: 'North America',
    carryOn: { l: 56, w: 36, h: 23, weight: 0, note: 'No stated weight limit' },
    personal: { l: 45, w: 35, h: 20, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: 'Basic Economy: no free checked bag' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'EK', name: 'Emirates', region: 'Middle East',
    carryOn: { l: 55, w: 38, h: 20, weight: 7, note: 'Economy: 1 piece 7kg' },
    personal: { l: 40, w: 30, h: 15, weight: 0, note: 'Laptop bag or handbag' },
    checked: { weight: 30, maxDim: 300, note: 'Generous allowance; varies by route/fare' },
    strictCarryOn: true, carryOnInBasic: true },
];

export function lookupAirline(code: string): Airline | null {
  if (!code || typeof code !== 'string') return null;
  const c = code.toUpperCase().trim();
  return AIRLINES.find(a => a.code === c) || null;
}

interface DimensionStatus {
  actual?: number;
  limit: number;
  over?: boolean;
}

export function checkBaggageCompliance(suitcase: { l: number, w: number, h: number }, airlineCode: string): { airline: Airline | null, compliant: boolean, warnings: string[], byDimension: Record<string, DimensionStatus> } {
  const airline = lookupAirline(airlineCode);
  if (!airline) return { airline: null, compliant: true, warnings: [], byDimension: {} };

  const { carryOn } = airline;
  const warnings: string[] = [];
  const byDimension: Record<string, DimensionStatus> = {};

  if (suitcase.l > carryOn.l) {
    warnings.push(`Length: ${suitcase.l}cm exceeds ${carryOn.l}cm limit`);
    byDimension.length = { actual: suitcase.l, limit: carryOn.l, over: true };
  }
  if (suitcase.w > carryOn.w) {
    warnings.push(`Width: ${suitcase.w}cm exceeds ${carryOn.w}cm limit`);
    byDimension.width = { actual: suitcase.w, limit: carryOn.w, over: true };
  }
  if (suitcase.h > carryOn.h) {
    warnings.push(`Height: ${suitcase.h}cm exceeds ${carryOn.h}cm limit`);
    byDimension.height = { actual: suitcase.h, limit: carryOn.h, over: true };
  }

  if (carryOn.weight > 0) {
    byDimension.weight = { limit: carryOn.weight };
  }

  return {
    airline,
    compliant: warnings.length === 0,
    warnings,
    byDimension,
  };
}
