// GOV.UK Foreign Travel Advice API — free, no API key, public UK government data.
// Docs: https://content-api.publishing.service.gov.uk/reference.html
// Pattern: GET https://www.gov.uk/api/content/foreign-travel-advice/{country-slug}

const API_BASE = 'https://www.gov.uk/api/content/foreign-travel-advice';

// Map ISO 3166-1 alpha-2 country codes to GOV.UK travel advice slugs.
// GOV.UK uses hyphenated lowercase country names.
const COUNTRY_SLUGS: Record<string, string> = {
  AF: 'afghanistan', AL: 'albania', DZ: 'algeria', AO: 'angola', AR: 'argentina',
  AM: 'armenia', AU: 'australia', AT: 'austria', AZ: 'azerbaijan', BS: 'bahamas',
  BH: 'bahrain', BD: 'bangladesh', BB: 'barbados', BY: 'belarus', BE: 'belgium',
  BZ: 'belize', BJ: 'benin', BT: 'bhutan', BO: 'bolivia', BA: 'bosnia-and-herzegovina',
  BW: 'botswana', BR: 'brazil', BN: 'brunei', BG: 'bulgaria', BF: 'burkina-faso',
  BI: 'burundi', KH: 'cambodia', CM: 'cameroon', CA: 'canada', CV: 'cape-verde',
  CF: 'central-african-republic', TD: 'chad', CL: 'chile', CN: 'china',
  CO: 'colombia', KM: 'comoros', CG: 'congo', CD: 'democratic-republic-of-congo',
  CR: 'costa-rica', CI: 'cote-d-ivoire', HR: 'croatia', CU: 'cuba', CY: 'cyprus',
  CZ: 'czech-republic', DK: 'denmark', DJ: 'djibouti', DM: 'dominica',
  DO: 'dominican-republic', EC: 'ecuador', EG: 'egypt', SV: 'el-salvador',
  GQ: 'equatorial-guinea', ER: 'eritrea', EE: 'estonia', SZ: 'eswatini',
  ET: 'ethiopia', FJ: 'fiji', FI: 'finland', FR: 'france', GA: 'gabon',
  GM: 'the-gambia', GE: 'georgia', DE: 'germany', GH: 'ghana', GR: 'greece',
  GD: 'grenada', GT: 'guatemala', GN: 'guinea', GW: 'guinea-bissau',
  GY: 'guyana', HT: 'haiti', HN: 'honduras', HU: 'hungary', IS: 'iceland',
  IN: 'india', ID: 'indonesia', IR: 'iran', IQ: 'iraq', IE: 'ireland',
  IL: 'israel', IT: 'italy', JM: 'jamaica', JP: 'japan', JO: 'jordan',
  KZ: 'kazakhstan', KE: 'kenya', KI: 'kiribati', KP: 'north-korea',
  KR: 'south-korea', KW: 'kuwait', KG: 'kyrgyzstan', LA: 'laos', LV: 'latvia',
  LB: 'lebanon', LS: 'lesotho', LR: 'liberia', LY: 'libya', LT: 'lithuania',
  LU: 'luxembourg', MG: 'madagascar', MW: 'malawi', MY: 'malaysia', MV: 'maldives',
  ML: 'mali', MT: 'malta', MH: 'marshall-islands', MR: 'mauritania', MU: 'mauritius',
  MX: 'mexico', FM: 'micronesia', MD: 'moldova', MC: 'monaco', MN: 'mongolia',
  ME: 'montenegro', MA: 'morocco', MZ: 'mozambique', MM: 'myanmar', NA: 'namibia',
  NR: 'nauru', NP: 'nepal', NL: 'netherlands', NZ: 'new-zealand', NI: 'nicaragua',
  NE: 'niger', NG: 'nigeria', MK: 'north-macedonia', NO: 'norway', OM: 'oman',
  PK: 'pakistan', PW: 'palau', PA: 'panama', PG: 'papua-new-guinea', PY: 'paraguay',
  PE: 'peru', PH: 'philippines', PL: 'poland', PT: 'portugal', QA: 'qatar',
  RO: 'romania', RU: 'russia', RW: 'rwanda', KN: 'st-kitts-and-nevis',
  LC: 'st-lucia', VC: 'st-vincent-and-the-grenadines', WS: 'samoa', SM: 'san-marino',
  ST: 'sao-tome-and-principe', SA: 'saudi-arabia', SN: 'senegal', RS: 'serbia',
  SC: 'seychelles', SL: 'sierra-leone', SG: 'singapore', SK: 'slovakia',
  SI: 'slovenia', SB: 'solomon-islands', SO: 'somalia', ZA: 'south-africa',
  SS: 'south-sudan', ES: 'spain', LK: 'sri-lanka', SD: 'sudan', SR: 'suriname',
  SE: 'sweden', CH: 'switzerland', SY: 'syria', TW: 'taiwan', TJ: 'tajikistan',
  TZ: 'tanzania', TH: 'thailand', TL: 'timor-leste', TG: 'togo', TO: 'tonga',
  TT: 'trinidad-and-tobago', TN: 'tunisia', TR: 'turkey', TM: 'turkmenistan',
  TV: 'tuvalu', UG: 'uganda', UA: 'ukraine', AE: 'united-arab-emirates',
  GB: 'united-kingdom', US: 'usa', UY: 'uruguay', UZ: 'uzbekistan',
  VU: 'vanuatu', VA: 'vatican-city', VE: 'venezuela', VN: 'vietnam',
  YE: 'yemen', ZM: 'zambia', ZW: 'zimbabwe', XK: 'kosovo', PS: 'the-occupied-palestinian-territories',
  HK: 'hong-kong', MO: 'macao',
};

export interface AdvisoryPart {
  slug?: string;
  title?: string;
  body?: string;
}

export interface AdvisoryRaw {
  details?: {
    current_travel_advice?: string;
    summary?: string;
    parts?: AdvisoryPart[];
  };
}

export interface TravelAdvisory {
  title: string;
  summary: string;
  updated: string | null;
  url: string;
  raw: AdvisoryRaw;
}

export interface PackingRelevance {
  safety: string;
  health: string;
  localLaws: string;
}

/** Map a country code (ISO 3166-1 alpha-2) to its GOV.UK travel advice slug. */
export function getSlug(countryCode: string): string | null {
  if (!countryCode) return null;
  return COUNTRY_SLUGS[countryCode.toUpperCase()] || null;
}

function stripHtml(html: string): string {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractSummary(details: AdvisoryRaw['details']): string | null {
  if (!details) return null;

  const summaryObj = details.current_travel_advice || details.summary;
  if (typeof summaryObj === 'string') return summaryObj;

  if (details.parts) {
    const summaryPart = details.parts.find(
      (p) => p.slug === 'summary' || p.title?.toLowerCase().includes('summary')
    );
    if (summaryPart?.body) {
      const text = stripHtml(summaryPart.body);
      return text.slice(0, 300) + (text.length > 300 ? '…' : '');
    }
  }

  return null;
}

/** Fetch a country's travel advisory from GOV.UK. */
export async function fetchTravelAdvisory(countryCode: string): Promise<TravelAdvisory | null> {
  const slug = getSlug(countryCode);
  if (!slug) return null;

  try {
    const res = await fetch(`${API_BASE}/${slug}`);
    if (!res.ok) return null;
    const data = await res.json();

    const details = data?.details;
    const summary = extractSummary(details);

    return {
      title: data?.title || `Travel advice for ${slug}`,
      summary: summary || 'Travel advisory available. Check the GOV.UK website for full details.',
      updated: data?.public_updated_at || null,
      url: `https://www.gov.uk/foreign-travel-advice/${slug}`,
      raw: data,
    };
  } catch {
    return null;
  }
}

/**
 * Get packing-relevant info from an advisory: safety, health, and local-law
 * notes that affect what's worth packing (modest dress, insect repellent...).
 */
export function extractPackingRelevance(advisory: { raw?: AdvisoryRaw } | null | undefined): PackingRelevance {
  const details = advisory?.raw?.details;
  if (!details) return { safety: '', health: '', localLaws: '' };

  const parts = details.parts || [];

  const findPart = (keyword: string): string => {
    const match = parts.find(
      (p) => (p.title || '').toLowerCase().includes(keyword) || (p.slug || '').includes(keyword)
    );
    return match?.body ? stripHtml(match.body).slice(0, 200) : '';
  };

  return {
    safety: findPart('safety'),
    health: findPart('health'),
    localLaws: findPart('local-laws'),
  };
}
