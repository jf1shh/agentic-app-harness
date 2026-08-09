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
  },
  'streetwear': {
    name: 'Y2K Streetwear',
    tops: [
      { name: 'White Baby Tee', color: 'white', time: 'day' },
      { name: 'Grey Oversized Graphic Hoodie', color: 'grey', time: 'day' },
      { name: 'Black Mesh Top', color: 'black', time: 'evening' },
      { name: 'Navy Velour Zip-up', color: 'navy', time: 'day' }
    ],
    bottoms: [
      { name: 'Olive Parachute Pants', color: 'olive', time: 'day' },
      { name: 'Blue Low-rise Baggy Jeans', color: 'blue', time: 'day' },
      { name: 'Black Cargo Mini Skirt', color: 'black', time: 'evening' }
    ],
    outerwear: [{ name: 'Black Cropped Puffer', color: 'black' }, { name: 'Vintage Leather Racing Jacket', color: 'brown' }],
    colors: ['#ff00ff', '#000000', '#00ffff']
  },
  'dark-academia': {
    name: 'Dark Academia',
    tops: [
      { name: 'Brown Tweed Vest', color: 'brown', time: 'day' },
      { name: 'Beige Cable Knit Sweater', color: 'beige', time: 'day' },
      { name: 'White Oxford Shirt', color: 'white', time: 'day' },
      { name: 'Black Ribbed Turtleneck', color: 'black', time: 'evening' }
    ],
    bottoms: [
      { name: 'Brown Plaid Trousers', color: 'brown', time: 'day' },
      { name: 'Olive Corduroy Pants', color: 'olive', time: 'day' },
      { name: 'Black Pleated Midi Skirt', color: 'black', time: 'evening' }
    ],
    outerwear: [{ name: 'Brown Tweed Blazer', color: 'brown' }, { name: 'Navy Long Wool Overcoat', color: 'navy' }],
    colors: ['#3e2723', '#1b5e20', '#4e342e']
  },
  'athleisure': {
    name: 'Athleisure',
    tops: [
      { name: 'Black Seamless Crop Top', color: 'black', time: 'day' },
      { name: 'Grey Performance Hoodie', color: 'grey', time: 'day' },
      { name: 'Navy Quarter-Zip Pullover', color: 'navy', time: 'day' },
      { name: 'White Dri-FIT Tee', color: 'white', time: 'day' }
    ],
    bottoms: [
      { name: 'Black Compression Leggings', color: 'black', time: 'day' },
      { name: 'Grey Joggers', color: 'grey', time: 'day' },
      { name: 'Navy Biker Shorts', color: 'navy', time: 'day' }
    ],
    outerwear: [{ name: 'Black Nylon Track Jacket', color: 'black' }, { name: 'Grey Fleece Zip-Up', color: 'grey' }],
    colors: ['#cfd8dc', '#263238', '#00bcd4']
  },
  'bohemian': {
    name: 'Bohemian / Resort',
    tops: [
      { name: 'White Flowy Linen Blouse', color: 'white', time: 'day' },
      { name: 'Beige Crochet Top', color: 'beige', time: 'day' },
      { name: 'Olive Off-shoulder Tunic', color: 'olive', time: 'evening' },
      { name: 'White Gauze Button-up', color: 'white', time: 'day' }
    ],
    bottoms: [
      { name: 'Khaki Tiered Maxi Skirt', color: 'khaki', time: 'day' },
      { name: 'Beige Linen Wide-leg Pants', color: 'beige', time: 'day' },
      { name: 'Blue Denim Cut-offs', color: 'blue', time: 'day' }
    ],
    outerwear: [{ name: 'White Lightweight Kimono', color: 'white' }, { name: 'Blue Denim Jacket', color: 'blue' }],
    colors: ['#f4a460', '#8b4513', '#556b2f']
  },
  'preppy': {
    name: 'Ivy League Prep',
    tops: [
      { name: 'White Oxford Shirt', color: 'white', time: 'day' },
      { name: 'Navy Polo Shirt', color: 'navy', time: 'day' },
      { name: 'Khaki Cable-Knit Sweater', color: 'khaki', time: 'day' },
      { name: 'White Breton Stripe Tee', color: 'white', time: 'day' }
    ],
    bottoms: [
      { name: 'Khaki Chinos', color: 'khaki', time: 'day' },
      { name: 'Navy Tailored Shorts', color: 'navy', time: 'day' },
      { name: 'Grey Wool Trousers', color: 'grey', time: 'day' }
    ],
    outerwear: [{ name: 'Navy Blazer', color: 'navy' }, { name: 'Beige Trench Coat', color: 'beige' }],
    colors: ['#1e3a8a', '#f8fafc', '#b8860b']
  },
  'rock': {
    name: 'Rock Chic',
    tops: [
      { name: 'Black Band Tee', color: 'black', time: 'day' },
      { name: 'White Vintage Graphic Tee', color: 'white', time: 'day' },
      { name: 'Red Plaid Flannel', color: 'red', time: 'day' },
      { name: 'Grey Distressed Sweater', color: 'grey', time: 'evening' }
    ],
    bottoms: [
      { name: 'Black Ripped Skinny Jeans', color: 'black', time: 'evening' },
      { name: 'Black Leather Mini Skirt', color: 'black', time: 'evening' },
      { name: 'Grey Slim Denim', color: 'grey', time: 'day' }
    ],
    outerwear: [{ name: 'Black Leather Moto Jacket', color: 'black' }, { name: 'Blue Distressed Denim Jacket', color: 'blue' }],
    colors: ['#0a0a0a', '#dc2626', '#64748b']
  },
  'whimsigoth': {
    name: 'Whimsigoth',
    tops: [
      { name: 'Black Lace Corset Top', color: 'black', time: 'evening' },
      { name: 'Purple Velvet Blouse', color: 'purple', time: 'evening' },
      { name: 'Navy Silk Camisole', color: 'navy', time: 'evening' },
      { name: 'Grey Crochet Overlay Top', color: 'grey', time: 'day' }
    ],
    bottoms: [
      { name: 'Black Velvet Maxi Skirt', color: 'black', time: 'evening' },
      { name: 'Navy Dark Floral Midi Skirt', color: 'navy', time: 'evening' },
      { name: 'Grey Wide-leg Trousers', color: 'grey', time: 'day' }
    ],
    outerwear: [{ name: 'Black Embroidered Kimono', color: 'black' }, { name: 'Purple Velvet Duster', color: 'purple' }],
    colors: ['#6b21a8', '#0a0a0a', '#1e3a8a']
  },
  'coastal': {
    name: 'Coastal Maritime',
    tops: [
      { name: 'White Linen Button-Down', color: 'white', time: 'day' },
      { name: 'Navy Striped Breton Top', color: 'navy', time: 'day' },
      { name: 'Beige Cable-Knit Sweater', color: 'beige', time: 'day' },
      { name: 'Blue Chambray Shirt', color: 'blue', time: 'day' }
    ],
    bottoms: [
      { name: 'White Linen Shorts', color: 'white', time: 'day' },
      { name: 'Navy Chino Shorts', color: 'navy', time: 'day' },
      { name: 'Beige Tailored Trousers', color: 'beige', time: 'day' }
    ],
    outerwear: [{ name: 'Navy Peacoat', color: 'navy' }, { name: 'Beige Fisherman Sweater', color: 'beige' }],
    colors: ['#1e3a8a', '#f8fafc', '#d4b886']
  },
  'cottagecore': {
    name: 'Cottagecore',
    tops: [
      { name: 'White Puff-Sleeve Blouse', color: 'white', time: 'day' },
      { name: 'Olive Green Crochet Top', color: 'olive', time: 'day' },
      { name: 'Pink Linen Camisole', color: 'pink', time: 'day' },
      { name: 'Beige Eyelet Blouse', color: 'beige', time: 'day' }
    ],
    bottoms: [
      { name: 'Brown Prairie Midi Skirt', color: 'brown', time: 'day' },
      { name: 'Beige Linen Wide-leg Pants', color: 'beige', time: 'day' },
      { name: 'Olive Smock Dress', color: 'olive', time: 'evening' }
    ],
    outerwear: [{ name: 'Beige Cable-Knit Cardigan', color: 'beige' }, { name: 'Brown Corduroy Jacket', color: 'brown' }],
    colors: ['#f8fafc', '#4d7c0f', '#a0522d']
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
