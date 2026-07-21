import { Garment } from '../types';

export const COLOR_MATCHES: Record<string, string[]> = {
  'black': ['white', 'grey', 'beige', 'khaki', 'olive', 'black'],
  'navy': ['white', 'grey', 'khaki', 'beige', 'olive', 'red', 'navy'],
  'khaki': ['black', 'navy', 'white', 'grey', 'olive', 'brown', 'khaki'],
  'beige': ['black', 'navy', 'white', 'grey', 'brown', 'olive', 'beige'],
  'white': ['black', 'navy', 'khaki', 'beige', 'grey', 'olive', 'brown', 'blue', 'red', 'green', 'white'],
  'grey': ['black', 'navy', 'white', 'blue', 'red', 'green', 'grey'],
  'olive': ['black', 'navy', 'white', 'khaki', 'beige', 'brown', 'olive'],
  'brown': ['white', 'khaki', 'beige', 'olive', 'brown'],
  'blue': ['white', 'grey', 'khaki', 'beige', 'black', 'navy', 'blue'],
  'red': ['white', 'grey', 'black', 'navy', 'beige', 'red'],
  'green': ['white', 'grey', 'black', 'khaki', 'beige', 'yellow', 'green'],
  'yellow': ['white', 'black', 'grey', 'navy', 'brown', 'olive', 'beige', 'khaki', 'green', 'yellow'],
  'pink': ['white', 'black', 'grey', 'navy', 'beige', 'brown', 'khaki', 'red', 'purple', 'pink'],
  'purple': ['white', 'black', 'grey', 'navy', 'beige', 'olive', 'pink', 'red', 'blue', 'purple']
};

export const doColorsMatch = (c1: string, c2: string): boolean => {
  if (!c1 || !c2) return true;
  const color1 = c1.toLowerCase();
  const color2 = c2.toLowerCase();
  if (color1 === color2) return true;
  if (COLOR_MATCHES[color1] && COLOR_MATCHES[color1].includes(color2)) return true;
  if (COLOR_MATCHES[color2] && COLOR_MATCHES[color2].includes(color1)) return true;
  return false;
};

export const getThermalValue = (name: string): number => {
  const n = name.toLowerCase();
  let tv = 3; // Base warmth

  // Material modifiers
  if (n.includes('wool') || n.includes('merino') || n.includes('cashmere') || n.includes('fleece') || n.includes('puffer') || n.includes('knit')) tv += 4;
  else if (n.includes('leather') || n.includes('denim') || n.includes('corduroy')) tv += 2;
  else if (n.includes('cotton') || n.includes('canvas') || n.includes('chinos')) tv += 1;
  else if (n.includes('linen') || n.includes('silk') || n.includes('mesh') || n.includes('gauze')) tv -= 1;

  // Garment type modifiers
  if (n.includes('coat') || n.includes('jacket') || n.includes('sweater') || n.includes('hoodie') || n.includes('parka')) tv += 3;
  else if (n.includes('shorts') || n.includes('tank') || n.includes('tee') || n.includes('t-shirt') || n.includes('skirt') || n.includes('camisole')) tv -= 1;

  return Math.max(1, Math.min(10, tv));
};

type LegacyGarment = { name: string; color: string; time?: 'day' | 'evening' };

export const PALETTES: Record<string, { name: string; tops: LegacyGarment[]; bottoms: LegacyGarment[]; outerwear: LegacyGarment[]; colors: string[] }> = {
  'quiet-luxury': {
    name: 'Quiet Luxury',
    tops: [
      { name: 'Beige Cashmere Crewneck', color: 'beige', time: 'day' },
      { name: 'Black Silk Button-down', color: 'black', time: 'evening' },
      { name: 'Grey Merino Turtleneck', color: 'grey', time: 'day' },
      { name: 'Crisp White Tee', color: 'white', time: 'day' }
    ],
    bottoms: [
      { name: 'Khaki Tailored Trousers', color: 'khaki', time: 'day' },
      { name: 'Dark Wash Denim', color: 'navy', time: 'day' },
      { name: 'Black Pleated Skirt', color: 'black', time: 'evening' }
    ],
    outerwear: [{ name: 'Camel Trench Coat', color: 'beige' }, { name: 'Structured Wool Blazer', color: 'grey' }],
    colors: ['#f5f5dc', '#1a1a1a', '#8b7355']
  },
  'gorpcore': {
    name: 'Gorpcore',
    tops: [
      { name: 'Olive Technical Base Layer', color: 'olive', time: 'day' },
      { name: 'Black Fleece Half-Zip', color: 'black', time: 'evening' },
      { name: 'Grey Graphic Climbing Tee', color: 'grey', time: 'day' },
      { name: 'Navy Merino Wool Top', color: 'navy', time: 'day' }
    ],
    bottoms: [
      { name: 'Khaki Cargo Hiking Pants', color: 'khaki', time: 'day' },
      { name: 'Black Waterproof Trousers', color: 'black', time: 'evening' },
      { name: 'Olive Nylon Shorts', color: 'olive', time: 'day' }
    ],
    outerwear: [{ name: 'Olive Gore-Tex Shell', color: 'olive' }, { name: 'Black Puffer Vest', color: 'black' }],
    colors: ['#4a5d23', '#cc5500', '#2f4f4f']
  },
  'scandi': {
    name: 'Scandi Minimalist',
    tops: [
      { name: 'White Oversized Poplin Shirt', color: 'white', time: 'day' },
      { name: 'Grey Chunky Knit Sweater', color: 'grey', time: 'day' },
      { name: 'Black Boxy T-Shirt', color: 'black', time: 'evening' },
      { name: 'Navy Striped Long-sleeve', color: 'navy', time: 'day' }
    ],
    bottoms: [
      { name: 'Blue Wide-leg Jeans', color: 'blue', time: 'day' },
      { name: 'Beige Linen Trousers', color: 'beige', time: 'day' },
      { name: 'Black Midi Slip Skirt', color: 'black', time: 'evening' }
    ],
    outerwear: [{ name: 'Grey Oversized Wool Coat', color: 'grey' }, { name: 'Olive Quilted Liner Jacket', color: 'olive' }],
    colors: ['#e8e8e8', '#4b5320', '#36454f']
  }
};

export const generateWardrobeFromArchetype = (archetypeKey: string, strategy: string, tripDuration: number): Garment[] => {
  const p = PALETTES[archetypeKey] || PALETTES['quiet-luxury'];
  const garments: Garment[] = [];
  
  let topsNeeded = tripDuration;
  let bottomsNeeded = Math.ceil(tripDuration / 2);

  if (strategy === 'minimalist') {
    topsNeeded = Math.ceil(tripDuration / 3);
    bottomsNeeded = Math.ceil(tripDuration / 5);
  } else if (strategy === 'flexible') {
    topsNeeded = Math.ceil(tripDuration / 2);
    bottomsNeeded = Math.ceil(tripDuration / 3);
  }

  topsNeeded = Math.max(1, Math.min(topsNeeded, p.tops.length));
  bottomsNeeded = Math.max(1, Math.min(bottomsNeeded, p.bottoms.length));

  let idCounter = 1;
  for (let i = 0; i < topsNeeded; i++) {
    const t = p.tops[i % p.tops.length];
    garments.push({
      id: `top-${idCounter++}`,
      name: t.name,
      category: 'clothes',
      roles: ['top'],
      colors: [t.color],
      time: t.time || 'day',
      warmth: getThermalValue(t.name),
      exclusionTags: [],
      weightGrams: 200,
      volumeCm3: 500
    });
  }

  for (let i = 0; i < bottomsNeeded; i++) {
    const b = p.bottoms[i % p.bottoms.length];
    garments.push({
      id: `bot-${idCounter++}`,
      name: b.name,
      category: 'clothes',
      roles: ['bottom'],
      colors: [b.color],
      time: b.time || 'day',
      warmth: getThermalValue(b.name),
      exclusionTags: [],
      weightGrams: 400,
      volumeCm3: 800
    });
  }

  const o = p.outerwear[0];
  if (o) {
    garments.push({
      id: `out-${idCounter++}`,
      name: o.name,
      category: 'clothes',
      roles: ['topper'],
      colors: [o.color],
      time: 'day',
      warmth: getThermalValue(o.name),
      exclusionTags: [],
      weightGrams: 800,
      volumeCm3: 1500
    });
  }

  return garments;
};
