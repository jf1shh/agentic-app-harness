import { describe, it, expect } from 'vitest';
import { parseClosetFile } from '../src/utils/fileImporter';

describe('fileImporter', () => {
  it('should parse simple markdown bullet lists with auto role/color/warmth detection', () => {
    const mdContent = `
# My Travel Closet
- White Linen Buttondown
- Navy Chinos Shorts
- Grey Wool Sweater
    `;

    const garments = parseClosetFile(mdContent);
    expect(garments.length).toBe(3);

    // Garment 1: White Linen Buttondown
    expect(garments[0].name).toBe('White Linen Buttondown');
    expect(garments[0].roles).toContain('top');
    expect(garments[0].roles).toContain('topper'); // buttondown auto-detects both
    expect(garments[0].colors).toContain('white');

    // Garment 2: Navy Chinos Shorts
    expect(garments[1].name).toBe('Navy Chinos Shorts');
    expect(garments[1].roles).toContain('bottom');
    expect(garments[1].colors).toContain('navy');

    // Garment 3: Grey Wool Sweater
    expect(garments[2].name).toBe('Grey Wool Sweater');
    expect(garments[2].roles).toContain('topper');
    expect(garments[2].colors).toContain('grey');
    expect(garments[2].warmth).toBeGreaterThanOrEqual(7); // Wool sweater scores high
  });

  it('should parse pipe-separated custom attributes', () => {
    const pipeContent = `
Navy Blazer | topper | navy | 8
White Cotton Tee | top | white | 2
Khaki Shorts | bottom | khaki | 3
    `;

    const garments = parseClosetFile(pipeContent);
    expect(garments.length).toBe(3);

    expect(garments[0].name).toBe('Navy Blazer');
    expect(garments[0].roles).toEqual(['topper']);
    expect(garments[0].colors).toEqual(['navy']);
    expect(garments[0].warmth).toBe(8);

    expect(garments[1].name).toBe('White Cotton Tee');
    expect(garments[1].roles).toEqual(['top']);
    expect(garments[1].colors).toEqual(['white']);
    expect(garments[1].warmth).toBe(2);
  });
});
