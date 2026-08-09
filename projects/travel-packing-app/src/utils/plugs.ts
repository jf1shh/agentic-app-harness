// IEC wall-plug types by ISO 3166-1 alpha-2 country code, for the
// destination-aware adapter suggestion. Not exhaustive -- unknown
// countries simply fall back to a generic universal adapter.
export const PLUG_TYPES: Record<string, string> = {
  US: 'A/B', CA: 'A/B', MX: 'A/B', JP: 'A/B', PH: 'A/B/C', TW: 'A/B',
  GB: 'G', IE: 'G', MT: 'G', CY: 'G', SG: 'G', HK: 'G', MY: 'G', AE: 'G', QA: 'G', KE: 'G',
  FR: 'C/E', BE: 'C/E', PL: 'C/E', CZ: 'C/E', SK: 'C/E', MA: 'C/E',
  DE: 'C/F', NL: 'C/F', ES: 'C/F', PT: 'C/F', AT: 'C/F', GR: 'C/F', HU: 'C/F',
  RO: 'C/F', SE: 'C/F', NO: 'C/F', FI: 'C/F', IS: 'C/F', TR: 'C/F', KR: 'C/F',
  ID: 'C/F', EG: 'C/F', RU: 'C/F',
  CH: 'C/J', IT: 'C/F/L', DK: 'C/E/F/K',
  AU: 'I', NZ: 'I', CN: 'A/C/I', AR: 'C/I',
  IN: 'C/D/M', ZA: 'C/M/N', BR: 'C/N', TH: 'A/B/C/O', IL: 'C/H', VN: 'A/C', SA: 'A/B/G',
};

/**
 * Resolves the destination's wall-plug type (e.g. "C/F"), or null when the
 * country is unknown/unmapped and a generic universal adapter is the right
 * call instead.
 */
export function getAdapterPlugType(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return PLUG_TYPES[countryCode.toUpperCase()] ?? null;
}
