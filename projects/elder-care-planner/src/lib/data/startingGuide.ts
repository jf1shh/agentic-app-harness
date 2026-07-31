/**
 * "Where to start looking" — process guidance and vetted resources (spec §11.13).
 *
 * The rest of this app models the money. This module covers what families get
 * wrong before any number matters: who to call, what to look at on a tour, and
 * — the part nobody tells them — which of the organisations offering to help
 * are paid by the providers they recommend.
 *
 * That last point is why every resource carries a `funding` label. It is the
 * §6 "Cite Confidence, Not Just Sources" rule applied to advice rather than to
 * figures: a referral service earning a commission when a family moves in is
 * genuinely useful *and* genuinely conflicted, and a reader weighing its
 * touring checklist deserves to know which. Presenting a paid-referral link as
 * neutral guidance is the same laundering this codebase removed from a cost
 * band — just wearing different clothes.
 *
 * Deliberately does NOT restate what the app already does. Buy-in versus rental
 * contracts and refund ladders are §6.5b; waitlist tracking is a field on
 * `FacilityNote`; "questions to ask before you sign" is its own panel; the
 * elder-law and Medicaid cautions live in `benefits.ts`.
 *
 * Static content. No network calls, no telemetry — the links are ordinary
 * anchors a reader may choose to follow, so §1.2 holds and the privacy specs
 * still pass with every outbound request blocked.
 */

export type ResourceFunding =
  /** A public agency. No commercial interest in where anyone moves. */
  | 'government'
  /** A nonprofit or trade association directory. */
  | 'nonprofit'
  /** Paid a commission by the providers it recommends. */
  | 'commercial_referral'
  /** Sells its own service directly to the family. */
  | 'commercial';

/** Which funding models oblige a resource to explain how it is paid. */
export function needsFundingDisclosure(funding: ResourceFunding): boolean {
  return funding === 'commercial_referral' || funding === 'commercial';
}

export interface GuideResource {
  readonly id: string;
  readonly name: string;
  readonly url?: string;
  /** What it is for, in one line, in the app's neutral voice. */
  readonly what: string;
  readonly funding: ResourceFunding;
  /**
   * How it makes money. Required for anything `needsFundingDisclosure` returns
   * true for, and asserted in the unit tests — a conflicted resource listed
   * without its conflict is the defect this field exists to prevent.
   */
  readonly fundingNote?: string;
}

export interface GuideGroup {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly resources: readonly GuideResource[];
}

const REFERRAL_NOTE =
  'A referral service: it is paid a commission by the communities it recommends when a resident '
  + 'moves in. Its directories and checklists are worth reading, and are not impartial.';

export const STARTING_GUIDE_GROUPS: readonly GuideGroup[] = [
  {
    id: 'in_home',
    title: 'Care at home, often the first step',
    intro:
      'Before a move enters the picture, most families start by adding support at home. A trusted '
      + 'local caregiver named by someone you know carries more weight than any review site.',
    resources: [
      {
        id: 'personal_referrals',
        name: 'Your own network',
        what:
          'Ask neighbours, colleagues and any clinician already involved. Personal referrals surface '
          + 'caregivers and small agencies that no directory lists.',
        funding: 'nonprofit',
      },
      {
        id: 'care_com',
        name: 'Care.com',
        url: 'https://www.care.com',
        what: 'A national matching platform: enter a zip code and care type for a list of local caregivers.',
        funding: 'commercial',
        fundingNote:
          'Charges families a subscription and takes a cut of placements. Vetting depth varies by '
          + 'listing, so check references yourself.',
      },
      {
        id: 'gogograndparent',
        name: 'GoGoGrandparent',
        url: 'https://gogograndparent.com/',
        what:
          'Phone-based concierge: arranges rides, meal delivery and home services without the older '
          + 'adult needing a smartphone.',
        funding: 'commercial',
        fundingNote: 'Charges a per-request fee on top of the underlying service.',
      },
      {
        id: 'meal_delivery',
        name: 'Senior meal delivery services',
        what:
          'Look for options that accommodate specific diets and allergies, do not require a long '
          + 'subscription, and are locally based. This is one of the harder categories to get right.',
        funding: 'commercial',
        fundingNote:
          'A paid service, and quality varies sharply. No single provider is named here because '
          + 'availability is local.',
      },
    ],
  },
  {
    id: 'touring',
    title: 'When care at home is not enough',
    intro:
      'Continuing care and life plan communities (CCRCs) combine independent living, assisted living '
      + 'and skilled nursing on one campus, so a resident can move between levels without relocating. '
      + 'This app already prices rental against buy-in contracts, including refund terms.',
    resources: [
      {
        id: 'medicare_care_compare',
        name: 'Medicare Care Compare',
        url: 'https://www.medicare.gov/care-compare',
        what:
          'Federal inspection ratings for the skilled-nursing portion of a community. Worth checking '
          + 'even when the immediate need is independent or assisted living.',
        funding: 'government',
      },
      {
        id: 'a_place_for_mom',
        name: 'A Place for Mom touring checklist',
        url: 'https://www.aplaceformom.com/image/web-lighthouse/prod/touring-checklists.pdf?t=default',
        what: 'A printable checklist for comparing communities consistently across visits.',
        funding: 'commercial_referral',
        fundingNote: REFERRAL_NOTE,
      },
    ],
  },
  {
    id: 'legal_financial',
    title: 'Legal and financial planning',
    intro:
      'Worth starting early and not worth waiting on. Elder law attorneys are in high demand and slow '
      + 'to respond, so make contact well before answers are needed, and let the rest of the search '
      + 'carry on meanwhile.',
    resources: [
      {
        id: 'ship',
        name: 'State Health Insurance Assistance Program (SHIP)',
        url: 'https://www.shiphelp.org/',
        what:
          'Free, state-run counselling on Medicare, Medicaid and supplemental insurance questions.',
        funding: 'government',
      },
      {
        id: 'elder_law_attorney',
        name: 'An elder law attorney',
        what:
          'A distinct specialty from general estate law: Medicaid and Medicare eligibility planning, '
          + 'powers of attorney, guardianship, trusts and long-term care planning. This app does not '
          + 'model eligibility, because getting it subtly wrong causes real financial harm.',
        funding: 'commercial',
        fundingNote: 'Paid by you, usually hourly or on a flat fee for a defined piece of work.',
      },
      {
        id: 'aplaceformom_financing',
        name: 'A Place for Mom financing articles',
        url: 'https://www.aplaceformom.com/caregiver-resources/articles/afford-assisted-living',
        what:
          'Explainers on affording assisted living, selling a home to pay for care, and reverse '
          + 'mortgages.',
        funding: 'commercial_referral',
        fundingNote: REFERRAL_NOTE,
      },
    ],
  },
  {
    id: 'moving',
    title: 'Moving and downsizing',
    intro: 'If a move is involved, specialists exist for the transition itself.',
    resources: [
      {
        id: 'nasmm',
        name: 'National Association of Senior & Specialty Move Managers',
        url: 'https://www.nasmm.org/',
        what:
          'Directory of senior move managers, who handle downsizing, decluttering and organising a '
          + 'home transition.',
        funding: 'nonprofit',
        },
    ],
  },
  {
    id: 'other',
    title: 'Other places to ask',
    intro:
      'Public and local services. Usefulness varies a great deal by region, so treat these as a first '
      + 'call rather than a guarantee.',
    resources: [
      {
        id: 'eldercare_locator',
        name: 'Eldercare Locator and your Area Agency on Aging',
        url: 'https://eldercare.acl.gov',
        what:
          'Government-run referral lists and caregiver support, organised by county. Search your '
          + 'county name plus "Area Agency on Aging" to find the local office.',
        funding: 'government',
      },
      {
        id: 'senior_centers',
        name: 'Local senior centers',
        what:
          'Some offer free legal or financial consultations, meals and transport help. Provision '
          + 'varies widely, so confirm before counting on it.',
        funding: 'nonprofit',
      },
    ],
  },
];

export interface TouringStep {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

/**
 * How to tour, as distinct from what to ask — the existing questions panel
 * covers the second. None of this is a claim about any particular community,
 * which is what keeps it inside §11.2.
 */
export const TOURING_GUIDANCE: readonly TouringStep[] = [
  {
    id: 'visit_in_person',
    title: 'Visit in person, more than once',
    detail:
      'Walk the halls and look at conditions at different times of day. An afternoon tour and a '
      + 'weekday evening can leave very different impressions of the same building.',
  },
  {
    id: 'talk_to_staff',
    title: 'Talk to care staff, not only the sales representative',
    detail:
      'The person showing you round is selling. The aides and nurses on the floor are the ones who '
      + 'will be there daily, and they answer differently.',
  },
  {
    id: 'tour_widely',
    title: 'Tour widely before narrowing',
    detail:
      'Include both chains and independent or nonprofit operators. Quality varies significantly '
      + 'within a single metro area. One ownership group running several local communities can mean '
      + 'more consistency and easier transfers between care levels.',
  },
  {
    id: 'match_the_need',
    title: 'Match the specific need',
    detail:
      'Memory care, mobility assistance, and a couple wanting to stay in one unit together each '
      + 'narrow the list differently. Ask how each is handled before comparing prices.',
  },
  {
    id: 'waitlists',
    title: 'Join several waitlists early',
    detail:
      'Waitlists commonly run a couple of months or longer, and an early favourite often turns out '
      + 'to be beyond budget. Record what each place said on the shortlist below.',
  },
];

/** Every resource across all groups, flattened. */
export function allGuideResources(): readonly GuideResource[] {
  return STARTING_GUIDE_GROUPS.flatMap((group) => group.resources);
}
