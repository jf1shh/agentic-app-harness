// Static dataset of airline baggage policies — carry-on and checked limits.
// Dimensions in cm (L x W x H), weights in kg.
// Data sourced from official airline websites as of mid-2026.
// Policies change frequently; treat as best-effort guidance, not legal advice.

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
  // -- European Budget --------------------------------------------------------
  { code: 'FR', name: 'Ryanair', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 20, weight: 10, note: 'Priority & 2 Cabin Bags fare' },
    personal: { l: 40, w: 30, h: 20, weight: 0, note: 'Free on all fares, under-seat only' },
    checked: { weight: 20, maxDim: 158, note: '10kg check-in bag also available' },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'U2', name: 'easyJet', region: 'Europe',
    carryOn: { l: 56, w: 45, h: 25, weight: 15, note: 'Large cabin bag, paid upgrade' },
    personal: { l: 45, w: 36, h: 20, weight: 15, note: 'Free on all fares, under-seat' },
    checked: { weight: 23, maxDim: 275, note: 'Total dims L+W+H <= 275cm' },
    strictCarryOn: false, carryOnInBasic: false },
  { code: 'W6', name: 'Wizz Air', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 10, note: 'Trolley bag, Wizz Priority required' },
    personal: { l: 40, w: 30, h: 20, weight: 10, note: 'Free on all fares, under-seat' },
    checked: { weight: 32, maxDim: 171, note: 'Per bag' },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'VY', name: 'Vueling', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 20, weight: 10, note: 'TimeFlex or Optima fare' },
    personal: { l: 40, w: 30, h: 20, weight: 0, note: 'Free on all fares' },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'EW', name: 'Eurowings', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8, note: 'BIZclass/ SMART fare' },
    personal: { l: 40, w: 30, h: 25, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'DY', name: 'Norwegian', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 10, note: 'LowFare+ / Flex / Premium' },
    personal: { l: 38, w: 30, h: 20, weight: 0, note: 'Free all fares, under-seat' },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'D8', name: 'Norwegian Air Sweden', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 10 },
    personal: { l: 38, w: 30, h: 20, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },

  // -- European Legacy --------------------------------------------------------
  { code: 'BA', name: 'British Airways', region: 'Europe',
    carryOn: { l: 56, w: 45, h: 25, weight: 23, note: '1 cabin bag + 1 personal item' },
    personal: { l: 40, w: 30, h: 15, weight: 0, note: 'Handbag/laptop bag' },
    checked: { weight: 23, maxDim: 208, note: '90x75x43cm' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'LH', name: 'Lufthansa', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8, note: 'Economy: 1 piece; Light fare: no free carry-on' },
    personal: { l: 40, w: 30, h: 10, weight: 0, note: 'Small personal item' },
    checked: { weight: 23, maxDim: 158, note: 'Economy Light: 0 free checked bags' },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'AF', name: 'Air France', region: 'Europe',
    carryOn: { l: 55, w: 35, h: 25, weight: 12, note: '1 cabin bag + 1 accessory' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'KL', name: 'KLM', region: 'Europe',
    carryOn: { l: 55, w: 35, h: 25, weight: 12, note: '1 piece + 1 accessory' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'LX', name: 'SWISS', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 10, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'OS', name: 'Austrian Airlines', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 10, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'SN', name: 'Brussels Airlines', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 10, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'AZ', name: 'ITA Airways', region: 'Europe',
    carryOn: { l: 55, w: 35, h: 25, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'IB', name: 'Iberia', region: 'Europe',
    carryOn: { l: 56, w: 45, h: 25, weight: 0, note: 'No stated weight limit, must self-lift' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'TP', name: 'TAP Air Portugal', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 20, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'AY', name: 'Finnair', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'SK', name: 'SAS Scandinavian', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'EI', name: 'Aer Lingus', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 24, weight: 10 },
    personal: { l: 33, w: 25, h: 20, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'A3', name: 'Aegean Airlines', region: 'Europe',
    carryOn: { l: 56, w: 45, h: 25, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },

  // -- Middle East --------------------------------------------------------
  { code: 'EK', name: 'Emirates', region: 'Middle East',
    carryOn: { l: 55, w: 38, h: 20, weight: 7, note: 'Economy: 1 piece 7kg' },
    personal: { l: 40, w: 30, h: 15, weight: 0, note: 'Laptop bag or handbag' },
    checked: { weight: 30, maxDim: 300, note: 'Generous allowance; varies by route/fare' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'QR', name: 'Qatar Airways', region: 'Middle East',
    carryOn: { l: 50, w: 37, h: 25, weight: 7, note: 'Economy: 1 piece 7kg' },
    personal: { l: 40, w: 30, h: 15, weight: 0, note: 'Ladies handbag or small briefcase' },
    checked: { weight: 25, maxDim: 300, note: 'Varies by route' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'EY', name: 'Etihad Airways', region: 'Middle East',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'TK', name: 'Turkish Airlines', region: 'Middle East',
    carryOn: { l: 55, w: 40, h: 23, weight: 8, note: '1 piece, generous allowance' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 30, maxDim: 158, note: '2 pieces on most intl routes' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'PC', name: 'Pegasus Airlines', region: 'Middle East',
    carryOn: { l: 55, w: 40, h: 20, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 20, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'FZ', name: 'flydubai', region: 'Middle East',
    carryOn: { l: 55, w: 40, h: 20, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 20, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },

  // -- North America Legacy --------------------------------------------------------
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
  { code: 'WN', name: 'Southwest Airlines', region: 'North America',
    carryOn: { l: 60, w: 40, h: 25, weight: 0, note: 'Most generous US carry-on: 24x16x10 in' },
    personal: { l: 47, w: 34, h: 21, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: '2 free checked bags included!' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'B6', name: 'JetBlue Airways', region: 'North America',
    carryOn: { l: 56, w: 35, h: 23, weight: 0, note: 'No weight limit stated' },
    personal: { l: 43, w: 33, h: 20, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: 'Blue Basic: no free checked bag' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'AS', name: 'Alaska Airlines', region: 'North America',
    carryOn: { l: 56, w: 36, h: 23, weight: 0, note: 'No weight limit' },
    personal: { l: 40, w: 30, h: 20, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'HA', name: 'Hawaiian Airlines', region: 'North America',
    carryOn: { l: 56, w: 36, h: 23, weight: 0 },
    personal: { l: 40, w: 30, h: 20, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'AC', name: 'Air Canada', region: 'North America',
    carryOn: { l: 55, w: 40, h: 23, weight: 10, note: 'Standard + personal article' },
    personal: { l: 43, w: 33, h: 16, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: 'Basic fare: no free checked bag' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'WS', name: 'WestJet', region: 'North America',
    carryOn: { l: 53, w: 38, h: 23, weight: 0 },
    personal: { l: 41, w: 33, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },

  // -- North America Budget --------------------------------------------------------
  { code: 'NK', name: 'Spirit Airlines', region: 'North America',
    carryOn: { l: 56, w: 46, h: 25, weight: 0, note: 'Paid carry-on; not included in base fare' },
    personal: { l: 45, w: 35, h: 20, weight: 0, note: 'Free personal item only in base fare' },
    checked: { weight: 18, maxDim: 158, note: 'Ultra-low-cost: everything extra' },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'F9', name: 'Frontier Airlines', region: 'North America',
    carryOn: { l: 61, w: 40, h: 25, weight: 0, note: 'Paid; not included in base fare' },
    personal: { l: 45, w: 35, h: 20, weight: 0, note: 'Free personal item fits under seat' },
    checked: { weight: 18, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },

  // -- Asia Pacific --------------------------------------------------------
  { code: 'SQ', name: 'Singapore Airlines', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 7, note: '1 piece 7kg, generous' },
    personal: { l: 40, w: 30, h: 10, weight: 0, note: 'Ladies handbag / small bag' },
    checked: { weight: 30, maxDim: 158, note: 'Varies; many routes include 25-30kg' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'CX', name: 'Cathay Pacific', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 30, maxDim: 203, note: '2 pieces on most routes' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'NH', name: 'ANA (All Nippon Airways)', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 25, weight: 10, note: 'Total dims <= 115cm' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: '2 pieces on international routes' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'JL', name: 'Japan Airlines', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 25, weight: 10, note: 'Total dims <= 115cm' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 203, note: '2 pieces on intl routes' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'KE', name: 'Korean Air', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 12, note: 'Total dims <= 115cm, generous weight' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'OZ', name: 'Asiana Airlines', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 10 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'CZ', name: 'China Southern', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'CA', name: 'Air China', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 5, note: 'Strict 5kg Economy limit' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'MU', name: 'China Eastern', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 10 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'AK', name: 'AirAsia', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7, note: '2 pieces combined max 7kg' },
    personal: { l: 40, w: 30, h: 10, weight: 0, note: 'Included in 7kg combined weight' },
    checked: { weight: 20, maxDim: 158, note: 'Strict; pre-book for best rates' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'TR', name: 'Scoot', region: 'Asia',
    carryOn: { l: 54, w: 38, h: 23, weight: 10, note: 'ScootPlus fare; Economy: paid' },
    personal: { l: 40, w: 30, h: 10, weight: 0 },
    checked: { weight: 20, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: false },
  { code: 'OD', name: 'Malindo Air / Batik Air', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 10, weight: 0 },
    checked: { weight: 20, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'PR', name: 'Philippine Airlines', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'MH', name: 'Malaysia Airlines', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 30, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'TG', name: 'Thai Airways', region: 'Asia',
    carryOn: { l: 56, w: 45, h: 25, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 30, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'GA', name: 'Garuda Indonesia', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'VN', name: 'Vietnam Airlines', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'CI', name: 'China Airlines', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'BR', name: 'EVA Air', region: 'Asia',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'FM', name: 'Shanghai Airlines', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'MF', name: 'Xiamen Airlines', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 5, note: 'Strict 5kg limit' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },

  // -- India & South Asia --------------------------------------------------------
  { code: '6E', name: 'IndiGo', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 7, note: '1 piece; total dims <= 115cm' },
    personal: { l: 40, w: 30, h: 10, weight: 3, note: 'Strict 3kg personal item limit' },
    checked: { weight: 15, maxDim: 158, note: 'Strict 15kg domestic; 23-30kg intl' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'AI', name: 'Air India', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 25, maxDim: 158, note: 'Generous 25kg domestic allowance' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'SG', name: 'SpiceJet', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 15, maxDim: 158, note: 'Strict 15kg domestic' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'UK', name: 'Vistara', region: 'Asia',
    carryOn: { l: 55, w: 40, h: 20, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 15, maxDim: 158, note: 'Domestic; varies international' },
    strictCarryOn: true, carryOnInBasic: true },

  // -- Oceania --------------------------------------------------------------
  { code: 'QF', name: 'Qantas', region: 'Oceania',
    carryOn: { l: 56, w: 36, h: 23, weight: 7, note: '1 piece on domestic; 2 on international' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'VA', name: 'Virgin Australia', region: 'Oceania',
    carryOn: { l: 56, w: 36, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'JQ', name: 'Jetstar Airways', region: 'Oceania',
    carryOn: { l: 56, w: 36, h: 23, weight: 7, note: 'Combined 7kg for both pieces' },
    personal: { l: 40, w: 30, h: 15, weight: 0, note: 'Small item included in 7kg total' },
    checked: { weight: 20, maxDim: 158, note: 'Strict 20kg per bag' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'NZ', name: 'Air New Zealand', region: 'Oceania',
    carryOn: { l: 55, w: 40, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },

  // -- Latin America --------------------------------------------------------
  { code: 'LA', name: 'LATAM Airlines', region: 'South America',
    carryOn: { l: 55, w: 35, h: 25, weight: 10 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'AV', name: 'Avianca', region: 'South America',
    carryOn: { l: 55, w: 35, h: 25, weight: 10, note: 'Light fare: personal item only' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: false },
  { code: 'AM', name: 'Aeromexico', region: 'North America',
    carryOn: { l: 55, w: 40, h: 25, weight: 10, note: '1 piece + 1 personal item' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 25, maxDim: 158, note: 'Includes 1-2 checked bags on most fares' },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'CM', name: 'Copa Airlines', region: 'South America',
    carryOn: { l: 56, w: 36, h: 23, weight: 10 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },
  { code: 'G3', name: 'Gol Linhas Aereas', region: 'South America',
    carryOn: { l: 55, w: 35, h: 25, weight: 10 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: false, carryOnInBasic: true },

  // -- Africa --------------------------------------------------------------
  { code: 'ET', name: 'Ethiopian Airlines', region: 'Africa',
    carryOn: { l: 55, w: 40, h: 23, weight: 7 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158, note: '2 pieces of 23kg on most intl routes' },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'SA', name: 'South African Airways', region: 'Africa',
    carryOn: { l: 56, w: 36, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'MS', name: 'EgyptAir', region: 'Africa',
    carryOn: { l: 55, w: 40, h: 23, weight: 8 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
  { code: 'KQ', name: 'Kenya Airways', region: 'Africa',
    carryOn: { l: 55, w: 40, h: 23, weight: 12, note: 'Total dims <= 115cm, 12kg generous' },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },

  // -- More European / Regional --------------------------------------------------------
  { code: 'SU', name: 'Aeroflot', region: 'Europe',
    carryOn: { l: 55, w: 40, h: 25, weight: 10 },
    personal: { l: 40, w: 30, h: 15, weight: 0 },
    checked: { weight: 23, maxDim: 158 },
    strictCarryOn: true, carryOnInBasic: true },
];

export function lookupAirline(code: string): Airline | null {
  if (!code || typeof code !== 'string') return null;
  const c = code.toUpperCase().trim();
  return AIRLINES.find(a => a.code === c) || null;
}

/**
 * Search airlines by name or code (partial match, case-insensitive).
 */
export function searchAirlines(query: string): Airline[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return AIRLINES.filter(a =>
    a.code.toLowerCase() === q ||
    a.name.toLowerCase().includes(q) ||
    a.code.toLowerCase().includes(q)
  ).slice(0, 12);
}

/**
 * Get all airlines, optionally filtered by region.
 */
export function getAllAirlines(region?: string): Airline[] {
  if (region) return AIRLINES.filter(a => a.region === region);
  return AIRLINES;
}

/**
 * Get the list of unique regions for grouping, sorted alphabetically.
 */
export function getRegions(): string[] {
  return Array.from(new Set(AIRLINES.map(a => a.region))).sort();
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
