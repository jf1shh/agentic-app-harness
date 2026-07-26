/**
 * Typical fee ranges for residential care.
 *
 * These are presented as *ranges to check a real contract against*, never as
 * quoted prices (spec §10.2). They come from consumer-guidance reporting rather
 * than a single primary dataset, and the UI says so wherever they appear.
 *
 * Their job is not to price a facility — it is to tell a family which questions
 * to ask before signing, which is what the research (§2.1) found families lack.
 */

export interface FeeRange {
  readonly id: string;
  readonly label: string;
  readonly lowCents: number;
  readonly highCents: number;
  readonly cadence: 'monthly' | 'one_time';
  readonly explanation: string;
}

export const FEE_RANGE_SOURCE = {
  description:
    'Typical ranges compiled from consumer guidance on assisted living billing practices, not from a single primary survey.',
  retrievedOn: '2026-07-26',
  isAuthoritative: false,
} as const;

export const TYPICAL_FEE_RANGES: readonly FeeRange[] = [
  {
    id: 'care_level_tier',
    label: 'Care-level tier',
    lowCents: 50_000,
    highCents: 200_000,
    cadence: 'monthly',
    explanation:
      'Most communities price care in tiers on top of base rent. A reassessment can move your parent up a tier at any time, and each step typically adds $500–$2,000 a month.',
  },
  {
    id: 'community_fee',
    label: 'Community / move-in fee',
    lowCents: 100_000,
    highCents: 500_000,
    cadence: 'one_time',
    explanation:
      'A one-time fee charged at move-in, usually non-refundable even if the stay is short. Commonly $1,000–$5,000.',
  },
  {
    id: 'medication_management',
    label: 'Medication management',
    lowCents: 30_000,
    highCents: 80_000,
    cadence: 'monthly',
    explanation: 'Charged separately by most communities once staff administer or supervise medication.',
  },
  {
    id: 'incontinence_supplies',
    label: 'Incontinence care and supplies',
    lowCents: 20_000,
    highCents: 60_000,
    cadence: 'monthly',
    explanation: 'Frequently billed as an add-on rather than included in the base rate.',
  },
  {
    id: 'transport',
    label: 'Transport to appointments',
    lowCents: 5_000,
    highCents: 30_000,
    cadence: 'monthly',
    explanation: 'Scheduled group transport is often included; individual appointment trips usually are not.',
  },
];

/**
 * The annual rate escalator band. Communities commonly raise base rates 3–5% a
 * year, which compounds and is the quietest driver of a plan running out early.
 */
export const ANNUAL_ESCALATOR_BAND = {
  low: 0.03,
  high: 0.05,
  default: 0.04,
} as const;

/** Care inflation runs ahead of general inflation; used as a projection default. */
export const CARE_INFLATION_BAND = {
  low: 0.03,
  high: 0.06,
  default: 0.045,
} as const;
