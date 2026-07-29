/**
 * A starting guide to outside help (spec §11.11).
 *
 * Five user-supplied categories, each a flat, always-open list of external
 * services a family commonly investigates when care arrives. The directory is
 * deliberately *not* a "facility directory" or referral engine — the app does
 * not earn anything from any listing, and the `intake` enum on every entry
 * makes the §1.1 distinction visible to the reader (free resource / matching
 * platform that earns provider fees / methodology-only advice).
 *
 * Three rules this surface holds to:
 *  - **§1.1 compliance is stated, not assumed.** Two prose disclaimers and a
 *    panel-level editorial correction appear on screen; the `intake` tag on
 *    every entry is the data side of the same claim. An entry marked `paid`
 *    is one the matching platform charges *the provider*, on referral —
 *    not the family, and the panel never derives money from the listing.
 *  - **Confidence cited, age on every entry.** `FigureConfidence` is reused
 *    from `data/costOfCare.ts` so the citation discipline is uniform with §6,
 *    and `checkedOn` is rendered in the footer so a stale entry is visible.
 *  - **URLs are optional.** Some resources ("personal referrals — ask your
 *    network") are by their nature not a link. They still appear on the page
 *    because the editorial value is in the note, not the link.
 */
import { z } from 'zod';
import { FigureConfidenceSchema, type FigureConfidence } from './costOfCare';

export const GuideCategorySchema = z.enum([
  'in_home_care',
  'community_evaluation',
  'legal_financial',
  'moving_logistics',
  'other_resources',
]);
export type GuideCategory = z.infer<typeof GuideCategorySchema>;

export const GuideIntakeSchema = z.enum([
  /** The resource is itself free to use — a government directory, a nonprofit, an editorial site. */
  'free',
  /**
   * The resource is a matching platform that charges the **provider** when a
   * family connects through it. The family pays nothing to use it. This app
   * does not earn any of those fees.
   */
  'paid',
  /**
   * The entry is a methodology suggestion ("always visit in person", "tour
   * widely before narrowing") with no anchor URL. Use `unknown` rather than
   * claiming it is free or paid.
   */
  'unknown',
]);
export type GuideIntake = z.infer<typeof GuideIntakeSchema>;

export const GuideEntrySchema = z.object({
  id: z.string().min(1).max(80),
  category: GuideCategorySchema,
  label: z.string().min(1).max(120),
  url: z.string().url().optional(),
  note: z.string().min(1).max(400),
  intake: GuideIntakeSchema,
  confidence: FigureConfidenceSchema,
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type GuideEntry = z.infer<typeof GuideEntrySchema>;

/** The date the curated list was last reviewed, YYYY-MM-DD. */
export const STARTING_GUIDE_CHECKED_ON = '2026-07-29';

/** Heading copy for each category, in display order. */
export const CATEGORY_LABELS: Record<GuideCategory, { heading: string; intro: string }> = {
  in_home_care: {
    heading: 'In-home care options',
    intro:
      'Before a move enters the picture, many families start here — aging in place with support. These are the resources a family commonly investigates first.',
  },
  community_evaluation: {
    heading: 'When in-home care is not enough: touring and evaluating communities',
    intro:
      'Honest answers to questions about Continuing Care communities, visit methodology, the rental vs. buy-in question, waitlists, and the skilled-nursing rating.',
  },
  legal_financial: {
    heading: 'Legal and financial planning',
    intro:
      'Worth starting well before they are needed. Elder law attorneys are often slow to respond, and getting these committees organised usually takes longer than the rest of the family expects.',
  },
  moving_logistics: {
    heading: 'Moving logistics',
    intro:
      'Specialists who handle home transitions, decluttering, and organising the move itself rather than the care.',
  },
  other_resources: {
    heading: 'Other resources worth checking',
    intro:
      'Government-run and locally-run programmes. Quality and usefulness vary by region — useful as a starting point, not a guarantee.',
  },
};

/**
 * The curated list. Order within each category is editorial; readers scan the
 * top entries first. `intake` is set honestly per the enum meaning above so
 * the visible tag is never aspirational.
 */
export const STARTING_GUIDE_ENTRIES: readonly GuideEntry[] = [
  // ─── 1. In-home care options ──────────────────────────────────────────────────
  {
    id: 'personal-referrals',
    category: 'in_home_care',
    label: 'Personal referrals',
    note: 'Ask the network. A trusted local caregiver or agency recommended by someone you know is worth more than any review site.',
    intake: 'unknown',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'care-com',
    category: 'in_home_care',
    label: 'Care.com',
    url: 'https://www.care.com/',
    note: 'Enter a zip code and care type for a list of local vetted caregivers. Care.com charges caregivers a subscription and earns referral fees from providers when a connection is made.',
    intake: 'paid',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'gogograndparent',
    category: 'in_home_care',
    label: 'GoGoGrandparent',
    url: 'https://gogograndparent.com/',
    note: 'Phone-based: arrange rides, meal delivery and home services for older adults without needing a smartphone. GoGoGrandparent adds a per-ride markup on Uber/Lyft and earns referral fees on other services.',
    intake: 'paid',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'meals-on-wheels',
    category: 'in_home_care',
    label: 'Meals on Wheels America (locator)',
    url: 'https://www.mealsonwheelsamerica.org/',
    note: 'Locate the local Meals on Wheels programme. Most are free or low-cost on a sliding scale; diet-specific accommodation varies by county. Hardest resource to find locally in practice — worth an early call.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'aplaceformom-resources',
    category: 'in_home_care',
    label: 'A Place for Mom — caregiver resources',
    url: 'https://www.aplaceformom.com/caregiver-resources',
    note: 'Articles and guidance for family members coordinating someone else’s care, not just the person receiving it. A Place for Mom also earns referral fees when families connect with communities through their matching service.',
    intake: 'paid',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },

  // ─── 2. Community evaluation ─────────────────────────────────────────────────
  {
    id: 'ccrc-concept',
    category: 'community_evaluation',
    label: 'Continuing Care / Life Plan communities (overview)',
    url: 'https://www.aarp.org/caregiving/basics/info-2017/life-care-communities.html',
    note: 'AARP explainer on CCRC / life plan communities, which combine independent living, assisted living, and skilled nursing in one place so residents can move between levels of care as needs change without relocating.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'medicare-care-compare',
    category: 'community_evaluation',
    label: 'Medicare Care Compare',
    url: 'https://www.medicare.gov/care-compare/',
    note: 'Check the skilled-nursing rating on every community, including independent and assisted living — Care Compare covers the skilled portion of any community that has one.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'visit-in-person',
    category: 'community_evaluation',
    label: 'Always visit in person',
    note: 'Walk the halls, check conditions at different times of day, and talk directly with staff rather than the tour guide or sales rep. Matters more than anything you will read online.',
    intake: 'unknown',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'tour-widely',
    category: 'community_evaluation',
    label: 'Tour widely before narrowing',
    note: 'Both chains and independents. Quality varies dramatically within a single metro area. A single ownership group with multiple local communities can mean more consistency and easier transfers between care levels.',
    intake: 'unknown',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'apply-multiple-waitlists',
    category: 'community_evaluation',
    label: 'Apply to multiple waitlists early',
    note: 'Waits commonly run a couple of months. Apply to your top 2–3 at once rather than betting on one — an early favourite frequently turns out to be over budget.',
    intake: 'unknown',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },

  // ─── 3. Legal and financial planning ──────────────────────────────────────────
  {
    id: 'naela-finder',
    category: 'legal_financial',
    label: 'National Academy of Elder Law Attorneys — directory',
    url: 'https://www.naela.org/',
    note: 'Elder law is a distinct specialty from general estate law — Medicaid/Medicare eligibility, powers of attorney, guardianships, trusts, long-term care, and end-of-life planning. Worth starting early: elder law attorneys are often in high demand and slow to respond.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'medicaid-planning-federal',
    category: 'legal_financial',
    label: 'Medicaid.gov (federal framework)',
    url: 'https://www.medicaid.gov/',
    note: 'Federal framework for Medicaid. Income and asset limits are state-specific. There is a five-year lookback on transfers. Many states publish plain-language explainers on whether Medicaid can take a home and the spend-down or income-trust options.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'ship-state-counsel',
    category: 'legal_financial',
    label: 'State Health Insurance Benefits Advisor program (SHIBA / SHIP)',
    url: 'https://www.shiphelp.org/',
    note: 'Free, state-run counselling on Medicare, Medicaid and supplemental insurance questions. Each state has its own programme with a different acronym (SHIBA in many, SHIP elsewhere).',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'hud-counseling',
    category: 'legal_financial',
    label: 'HUD-approved housing counselling',
    url: 'https://www.hud.gov/fha/counseling',
    note: 'Free HUD-approved counselling on reverse mortgages and other home-equity options. For selling a house to pay for care, talk to a HUD counsellor before signing anything — the numbers should be a starting point, not a final answer.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },

  // ─── 4. Moving logistics ─────────────────────────────────────────────────────
  {
    id: 'nasmm-directory',
    category: 'moving_logistics',
    label: 'National Association of Senior & Specialty Move Managers',
    url: 'https://www.nasmm.org/',
    note: 'Specialists who handle home transitions, decluttering and organising the move itself rather than the care. Directories are searchable by ZIP code.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },

  // ─── 5. Other resources ──────────────────────────────────────────────────────
  {
    id: 'eldercare-locator',
    category: 'other_resources',
    label: 'Eldercare Locator',
    url: 'https://eldercare.acl.gov/',
    note: 'U.S. Administration for Community Living. Connects older adults and families to the Area Agency on Aging for the family’s county. A first call worth making — quality of each AAA varies but the directory is comprehensive.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
  {
    id: 'usaging-aaa',
    category: 'other_resources',
    label: 'USAging (Area Agencies on Aging)',
    url: 'https://www.usaging.org/',
    note: 'National network of Area Agencies on Aging. Many AAAs maintain caregiver support resources and dementia-friendly programmes; some offer free legal or financial consultations. Varies by location — call before relying on any single service.',
    intake: 'free',
    confidence: 'verified',
    checkedOn: STARTING_GUIDE_CHECKED_ON,
  },
];

/** Display order for the five categories. Matches the user-supplied list exactly. */
export const GUIDE_CATEGORY_ORDER: readonly GuideCategory[] = [
  'in_home_care',
  'community_evaluation',
  'legal_financial',
  'moving_logistics',
  'other_resources',
];

/** Lookup: every id must be unique. Asserted at module-load (vitest gates on it). */
export const GUIDE_ENTRY_BY_ID: Readonly<Record<string, GuideEntry>> = Object.freeze(
  Object.fromEntries(STARTING_GUIDE_ENTRIES.map((e) => [e.id, e])),
);

/** Visible label for an intake classification. */
export const INTAKE_LABEL: Record<GuideIntake, string> = {
  free: 'Free resource',
  paid: 'Matching service',
  unknown: 'Advice',
};

/** Visible marker for confidence on each entry (small, muted). */
export function confidenceLabel(c: FigureConfidence): string {
  switch (c) {
    case 'verified':
      return 'Checked';
    case 'needs_verification':
      return 'Needs re-checking';
    case 'derived':
      return 'Derived';
  }
}
