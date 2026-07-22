import { Garment } from '../types';
import { getThermalValue } from './generator';

const KNOWN_COLORS = [
  'white', 'black', 'navy', 'grey', 'gray', 'beige', 'khaki', 
  'blue', 'red', 'green', 'brown', 'olive', 'cream', 'pink', 'tan'
];

export function parseClosetFile(fileContent: string): Garment[] {
  const lines = fileContent.split(/\r?\n/);
  const garments: Garment[] = [];

  let count = 1;

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    
    // Remove markdown list symbols (- *, 1. etc)
    line = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
    if (!line || line.startsWith('#')) continue; // Skip headers/comments

    // Handle Pipe-separated format: "Name | role | color | warmth"
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      const name = parts[0];
      const roleStr = parts[1] ? parts[1].toLowerCase() : '';
      const colorStr = parts[2] ? parts[2].toLowerCase() : '';
      const warmthNum = parts[3] ? parseInt(parts[3], 10) : NaN;

      const roles: ('top' | 'bottom' | 'topper' | 'layer')[] = [];
      const roleTokens = roleStr.split(/[\s,]+/).map(s => s.trim());
      
      if (roleTokens.includes('top')) roles.push('top');
      if (roleTokens.some(t => t.startsWith('bottom') || t.startsWith('pant') || t.startsWith('short'))) roles.push('bottom');
      if (roleTokens.some(t => t.startsWith('topper') || t.startsWith('layer') || t.startsWith('jacket') || t.startsWith('sweater'))) roles.push('topper');

      if (roles.length === 0) {
        roles.push(...autoDetectRoles(name));
      }

      const colors = colorStr ? colorStr.split(',').map(c => c.trim()) : autoDetectColors(name);
      const warmth = !isNaN(warmthNum) ? warmthNum : getThermalValue(name);

      garments.push(createGarmentObj(count++, name, roles, colors, warmth));
      continue;
    }

    // Handle Natural Text / Markdown format: "- White Linen Shirt (top, white, warmth 2)" or plain "- White Linen Shirt"
    let name = line;
    let roles: ('top' | 'bottom' | 'topper' | 'layer')[] = [];
    let colors: string[] = [];
    let warmth: number | null = null;

    const parenMatch = line.match(/^(.*?)\((.*?)\)$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      const meta = parenMatch[2].toLowerCase();
      
      if (meta.includes('top')) roles.push('top');
      if (meta.includes('bottom') || meta.includes('pant') || meta.includes('short')) roles.push('bottom');
      if (meta.includes('topper') || meta.includes('layer') || meta.includes('jacket') || meta.includes('sweater')) roles.push('topper');

      KNOWN_COLORS.forEach(c => {
        if (meta.includes(c)) colors.push(c);
      });

      const wMatch = meta.match(/warmth\s*(\d+)/);
      if (wMatch) warmth = parseInt(wMatch[1], 10);
    }

    if (roles.length === 0) roles = autoDetectRoles(name);
    if (colors.length === 0) colors = autoDetectColors(name);
    if (warmth === null) warmth = getThermalValue(name);

    garments.push(createGarmentObj(count++, name, roles, colors, warmth));
  }

  return garments;
}

function autoDetectRoles(name: string): ('top' | 'bottom' | 'topper' | 'layer')[] {
  const n = name.toLowerCase();
  const roles: ('top' | 'bottom' | 'topper' | 'layer')[] = [];

  if (n.includes('shirt') || n.includes('tee') || n.includes('t-shirt') || n.includes('blouse') || n.includes('tank') || n.includes('polo') || n.includes('buttondown') || n.includes('top')) {
    roles.push('top');
  }
  if (n.includes('pant') || n.includes('chinos') || n.includes('shorts') || n.includes('jean') || n.includes('trouser') || n.includes('skirt') || n.includes('bottom')) {
    roles.push('bottom');
  }
  if (n.includes('sweater') || n.includes('jacket') || n.includes('coat') || n.includes('cardigan') || n.includes('hoodie') || n.includes('blazer') || n.includes('topper') || n.includes('layer')) {
    roles.push('topper');
  }
  if (n.includes('buttondown') || n.includes('overshirt')) {
    if (!roles.includes('topper')) roles.push('topper');
  }

  if (roles.length === 0) roles.push('top');
  return roles;
}

function autoDetectColors(name: string): string[] {
  const n = name.toLowerCase();
  const found = KNOWN_COLORS.filter(c => n.includes(c));
  return found.length > 0 ? found : ['navy'];
}

function createGarmentObj(
  num: number, 
  name: string, 
  roles: ('top' | 'bottom' | 'topper' | 'layer')[], 
  colors: string[], 
  warmth: number
): Garment {
  const isPantsOrCoat = roles.includes('bottom') || roles.includes('topper');
  const lower = name.toLowerCase();
  return {
    id: `custom-g-${num}`,
    name,
    category: roles[0] || 'top',
    roles,
    colors,
    warmth,
    exclusionTags: [],
    weightGrams: isPantsOrCoat ? 500 : 200,
    volumeCm3: isPantsOrCoat ? 1500 : 600,
    time: lower.includes('evening') || lower.includes('formal') || lower.includes('silk') ? 'evening' : 'day'
  };
}
