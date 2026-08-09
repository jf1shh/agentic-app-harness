// Lookup table of popular suitcase brands, models, and dimensions.
// Dimensions in cm (L x W x H). Used by the suitcase finder and barcode lookup.
//
// Barcode prefixes are approximate — real UPC/EAN manufacturer prefixes vary.
// When a barcode is scanned, the full number is matched against known prefixes.
// If no match, the raw barcode is still shown and the user can search by brand.

export interface SuitcaseModel {
  brand: string;
  model: string;
  l: number;
  w: number;
  h: number;
  type: string;
  preset?: string;
  upcPrefixes?: string[];
}

export const MODELS: SuitcaseModel[] = [
  // -- Away --------------------------------------------------------------
  { brand: 'Away', model: 'The Carry-On', l: 55.0, w: 34.8, h: 22.8, type: 'carry-on',
    preset: 'away-carry', upcPrefixes: ['81875802', '85000828'] },
  { brand: 'Away', model: 'The Bigger Carry-On', l: 57.7, w: 37.1, h: 24.1, type: 'carry-on',
    preset: 'custom', upcPrefixes: ['81875803'] },
  { brand: 'Away', model: 'The Medium', l: 66.0, w: 44.5, h: 27.9, type: 'check-in',
    preset: 'custom', upcPrefixes: ['81875804'] },
  { brand: 'Away', model: 'The Large', l: 73.7, w: 48.3, h: 30.5, type: 'check-in',
    preset: 'custom', upcPrefixes: ['81875805'] },

  // -- Rimowa --------------------------------------------------------------
  { brand: 'Rimowa', model: 'Essential Cabin', l: 55.0, w: 40.0, h: 23.0, type: 'carry-on',
    preset: 'rimowa-cabin', upcPrefixes: ['40564890'] },
  { brand: 'Rimowa', model: 'Essential Check-In L', l: 78.0, w: 51.0, h: 27.5, type: 'check-in',
    preset: 'custom', upcPrefixes: ['40564891'] },
  { brand: 'Rimowa', model: 'Original Cabin', l: 55.0, w: 40.0, h: 23.0, type: 'carry-on',
    preset: 'rimowa-cabin', upcPrefixes: [] },
  { brand: 'Rimowa', model: 'Classic Cabin', l: 55.0, w: 40.0, h: 23.0, type: 'carry-on',
    preset: 'rimowa-cabin', upcPrefixes: [] },

  // -- Samsonite --------------------------------------------------------------
  { brand: 'Samsonite', model: 'Freeform Carry-On Spinner', l: 55.0, w: 38.0, h: 23.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: ['04372523'] },
  { brand: 'Samsonite', model: 'Winfield 3 DLX Carry-On', l: 55.9, w: 38.1, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Samsonite', model: 'Omni PC Carry-On', l: 55.9, w: 38.1, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Samsonite', model: 'Check-In Large', l: 75.0, w: 51.0, h: 31.0, type: 'check-in',
    preset: 'samsonite-check', upcPrefixes: ['04372524'] },

  // -- Monos --------------------------------------------------------------
  { brand: 'Monos', model: 'Carry-On', l: 55.9, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'monos-carry', upcPrefixes: ['86000977'] },
  { brand: 'Monos', model: 'Carry-On Plus', l: 58.4, w: 38.1, h: 24.1, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Monos', model: 'Check-In Medium', l: 66.0, w: 45.7, h: 27.9, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Monos', model: 'Check-In Large', l: 76.2, w: 50.8, h: 30.5, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },

  // -- Travelpro --------------------------------------------------------------
  { brand: 'Travelpro', model: 'Platinum Elite Carry-On 21"', l: 59.7, w: 36.8, h: 22.9, type: 'carry-on',
    preset: 'travelpro-21', upcPrefixes: ['02567421'] },
  { brand: 'Travelpro', model: 'Platinum Elite Check-In 25"', l: 68.6, w: 45.7, h: 27.9, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Travelpro', model: 'Maxlite 5 Carry-On 21"', l: 58.4, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Travelpro', model: 'Crew Versapack Carry-On 21"', l: 59.7, w: 36.8, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },

  // -- BEIS --------------------------------------------------------------
  { brand: 'BÉIS', model: 'Carry-On Roller', l: 58.0, w: 40.0, h: 25.4, type: 'carry-on',
    preset: 'beis-roller', upcPrefixes: ['85001676'] },
  { brand: 'BÉIS', model: 'Check-In Roller 26"', l: 68.6, w: 45.7, h: 30.5, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'BÉIS', model: 'Check-In Roller 29"', l: 76.2, w: 50.8, h: 33.0, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },

  // -- Osprey (Backpacks) --------------------------------------------------------------
  { brand: 'Osprey', model: 'Farpoint 40L', l: 55.0, w: 35.0, h: 23.0, type: 'backpack',
    preset: 'osprey-40', upcPrefixes: ['84513608'] },
  { brand: 'Osprey', model: 'Farpoint 55L', l: 65.0, w: 38.0, h: 28.0, type: 'backpack',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Osprey', model: 'Fairview 40L', l: 53.0, w: 35.0, h: 22.0, type: 'backpack',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Osprey', model: 'Porter 46L', l: 56.0, w: 36.0, h: 25.0, type: 'backpack',
    preset: 'custom', upcPrefixes: [] },

  // -- Peak Design --------------------------------------------------------------
  { brand: 'Peak Design', model: 'Travel Backpack 45L', l: 56.0, w: 33.0, h: 24.0, type: 'backpack',
    preset: 'peak-45', upcPrefixes: ['81837302'] },
  { brand: 'Peak Design', model: 'Travel Backpack 30L', l: 53.0, w: 29.0, h: 20.0, type: 'backpack',
    preset: 'custom', upcPrefixes: [] },

  // -- Tumi --------------------------------------------------------------
  { brand: 'Tumi', model: 'Alpha 3 Carry-On', l: 55.9, w: 40.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: ['74231541'] },
  { brand: 'Tumi', model: 'Alpha Bravo Esports Pro', l: 55.9, w: 38.1, h: 25.4, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Tumi', model: '19 Degree Carry-On', l: 55.9, w: 40.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },

  // -- Delsey --------------------------------------------------------------
  { brand: 'Delsey', model: 'Paris Carry-On', l: 55.0, w: 38.0, h: 25.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Delsey', model: 'Helium Aero Carry-On', l: 54.6, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },

  // -- American Tourister --------------------------------------------------------------
  { brand: 'American Tourister', model: 'Stratum XLT Carry-On', l: 55.9, w: 38.1, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'American Tourister', model: 'Pop Max Softside 21"', l: 53.3, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },

  // -- Briggs & Riley --------------------------------------------------------------
  { brand: 'Briggs & Riley', model: 'Baseline Carry-On 21"', l: 55.9, w: 38.1, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Briggs & Riley', model: 'Torq Carry-On 21"', l: 55.9, w: 38.1, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },

  // -- July, Arlo Skye, Paravel, Roam --------------------------------------------------------------
  { brand: 'July', model: 'Carry-On', l: 55.0, w: 38.0, h: 21.5, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'July', model: 'Carry-On Pro', l: 55.0, w: 38.0, h: 21.5, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Arlo Skye', model: 'The Carry-On', l: 56.0, w: 36.0, h: 23.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Paravel', model: 'Aviator Carry-On', l: 55.9, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Roam', model: 'The Carry-On', l: 55.9, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },

  // -- High-volume mainstream & budget brands --------------------------------------------------------------
  // (dimensions are manufacturer-listed overall sizes, incl. wheels/handles)
  { brand: 'Amazon Basics', model: '21" Hardside Spinner', l: 55.0, w: 38.0, h: 25.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Amazon Basics', model: '28" Hardside Spinner', l: 71.0, w: 48.0, h: 30.0, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Amazon Basics', model: '21" Softside Spinner', l: 56.0, w: 36.0, h: 24.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Rockland', model: 'Melbourne 20" Expandable', l: 51.0, w: 35.5, h: 23.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Rockland', model: 'Melbourne 28"', l: 71.0, w: 48.3, h: 30.5, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Coolife', model: '20" Carry-On Spinner', l: 55.0, w: 37.0, h: 24.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Coolife', model: '28" Check-In Spinner', l: 75.0, w: 51.0, h: 32.0, type: 'check-in',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'SwissGear', model: 'Sion 6283 21"', l: 58.4, w: 35.6, h: 26.7, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'SwissGear', model: '7366 23" Hardside', l: 58.4, w: 40.6, h: 26.7, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Wrangler', model: '20" Smart Spinner', l: 50.8, w: 34.3, h: 21.6, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Kenneth Cole', model: 'Out of Bounds 20"', l: 55.9, w: 34.3, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'it luggage', model: "World's Lightest 21.8\"", l: 55.4, w: 35.0, h: 20.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Calpak', model: 'Hue Carry-On', l: 56.0, w: 38.0, h: 24.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Level8', model: 'Road Runner Carry-On 20"', l: 55.9, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Solgaard', model: 'Carry-On Closet', l: 55.9, w: 34.3, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Victorinox', model: 'Werks Traveler 6.0 Carry-On', l: 55.0, w: 40.0, h: 22.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Eagle Creek', model: 'Expanse 4-Wheel 21.75"', l: 55.0, w: 35.5, h: 23.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Thule', model: 'Aion Carry-On 55cm', l: 55.0, w: 35.0, h: 23.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'LOJEL', model: 'Cubo Small', l: 55.0, w: 39.5, h: 25.0, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: 'Open Story', model: 'Hardside Carry-On', l: 55.9, w: 35.6, h: 22.9, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
  { brand: "Traveler's Choice", model: 'Maxporter II 22"', l: 55.9, w: 40.6, h: 24.1, type: 'carry-on',
    preset: 'custom', upcPrefixes: [] },
];

/**
 * Search for a suitcase model by scanned barcode.
 * Checks UPC/EAN prefix matches against the database.
 */
export function lookupByBarcode(barcode: string): SuitcaseModel | null {
  if (!barcode || barcode.length < 8) return null;
  const clean = barcode.replace(/[\s-]/g, '');

  for (const m of MODELS) {
    for (const prefix of m.upcPrefixes || []) {
      if (clean === prefix || clean.startsWith(prefix) || prefix.startsWith(clean)) {
        return m;
      }
    }
  }
  return null;
}

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

export function getModelsForBrand(brand: string): SuitcaseModel[] {
  if (!brand) return [];
  const b = brand.toLowerCase().trim();
  return MODELS.filter(m => m.brand.toLowerCase() === b);
}
