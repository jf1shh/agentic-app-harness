export interface SuitcaseModel {
  brand: string;
  model: string;
  l: number;
  w: number;
  h: number;
  type: string;
}

export const MODELS: SuitcaseModel[] = [
  { brand: 'Away', model: 'The Carry-On', l: 55.0, w: 34.8, h: 22.8, type: 'carry-on' },
  { brand: 'Away', model: 'The Bigger Carry-On', l: 57.7, w: 37.1, h: 24.1, type: 'carry-on' },
  { brand: 'Rimowa', model: 'Essential Cabin', l: 55.0, w: 40.0, h: 23.0, type: 'carry-on' },
  { brand: 'Monos', model: 'Carry-On', l: 55.9, w: 35.6, h: 22.9, type: 'carry-on' },
  { brand: 'Osprey', model: 'Farpoint 40L', l: 55.0, w: 35.0, h: 23.0, type: 'backpack' },
  { brand: 'BÉIS', model: 'Carry-On Roller', l: 58.0, w: 40.0, h: 25.4, type: 'carry-on' },
];

export function searchByBrand(query: string): SuitcaseModel[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const results = MODELS.filter(m =>
    m.brand.toLowerCase().includes(q) ||
    m.model.toLowerCase().includes(q)
  );
  const seen = new Set();
  return results.filter(r => {
    const key = `${r.brand}|${r.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

export function getAllBrands(): string[] {
  return Array.from(new Set(MODELS.map(m => m.brand))).sort();
}
