/**
 * Benefit reality check.
 *
 * Informational only — this is explicitly *not* an eligibility determination
 * (spec §1.1). Each card leads with its timing trap, because the research (§2.6)
 * found that families lose access to benefits through delay far more often than
 * through ineligibility.
 *
 * The most valuable single line in the app lives here: Medicare does not pay for
 * long-term custodial care. Assuming otherwise is the most expensive
 * misconception in the domain.
 */

export interface BenefitCard {
  readonly id: string;
  readonly name: string;
  /** The headline correction or the thing families most often get wrong. */
  readonly headline: string;
  readonly covers: readonly string[];
  readonly doesNotCover: readonly string[];
  /** The deadline, clock or waiting period that costs families money. */
  readonly timingTrap: string;
  readonly nextStep: string;
  readonly sourceNote: string;
}

export const BENEFITS_CHECKED_ON = '2026-07-26';

export const BENEFIT_CARDS: readonly BenefitCard[] = [
  {
    id: 'medicare',
    name: 'Medicare',
    headline: 'Medicare does not pay for long-term custodial care.',
    covers: [
      'Up to 100 days in a skilled nursing facility after a qualifying hospital stay',
      'Doctor visits, hospital care and prescription drugs under the usual parts',
      'Short-term skilled home health care when medically ordered',
    ],
    doesNotCover: [
      'Assisted living rent or fees',
      'Long-term nursing home stays',
      'Help with bathing, dressing, meals or supervision on its own (custodial care)',
    ],
    timingTrap:
      'The skilled nursing benefit requires a qualifying inpatient hospital stay first, and a daily copay starts after day 20. Coverage ends at 100 days at the very most — it is not a long-term funding source.',
    nextStep:
      'Plan long-term care costs as if Medicare will contribute nothing, then treat any skilled-nursing coverage as a short-term reprieve.',
    sourceNote: 'General programme rules; confirm current copay amounts at medicare.gov.',
  },
  {
    id: 'medicaid',
    name: 'Medicaid',
    headline: 'Pays for nursing home care, but only after assets are spent down.',
    covers: [
      'Nursing home care for those who meet state income and asset limits',
      'Some home and community-based services, varying widely by state',
    ],
    doesNotCover: [
      'Assisted living rent in most states',
      'Care for anyone above the state asset limit until they have spent down',
    ],
    timingTrap:
      'There is a five-year lookback on asset transfers. Gifts or property transfers made in the five years before applying can trigger a penalty period during which Medicaid pays nothing. Federal spousal impoverishment rules protect a portion of assets and income for a spouse still living at home.',
    nextStep:
      'If a nursing home is plausible within five years, talk to an elder law attorney before moving any assets. This app deliberately does not model eligibility — getting it subtly wrong causes real financial harm.',
    sourceNote:
      'Federal framework; income and asset limits are state-specific. Check your state Medicaid agency.',
  },
  {
    id: 'va_aid_attendance',
    name: 'VA Aid & Attendance',
    headline: 'A pension supplement many eligible veterans never claim.',
    covers: [
      'A monthly supplement for wartime veterans and surviving spouses who need help with daily activities',
      'Can be used toward in-home care, assisted living or nursing home costs',
    ],
    doesNotCover: [
      'Veterans who do not meet the wartime service, care-need and financial tests',
    ],
    timingTrap:
      'Applications commonly take months to process, and benefits are not paid for care you needed before applying. Applying early matters more than applying perfectly.',
    nextStep:
      'Check service era and care needs with an accredited VA claims agent or your county veterans service officer. Current income and asset thresholds change annually — confirm before relying on them.',
    sourceNote: 'Programme structure only. Current MAPR thresholds are not bundled in this app.',
  },
  {
    id: 'ltc_insurance',
    name: 'Long-term care insurance',
    headline: 'If a policy exists, its waiting period and benefit cap decide what it is worth.',
    covers: [
      'A daily or monthly benefit toward qualifying care, once the policy is triggered',
    ],
    doesNotCover: [
      'Care during the elimination period, which you pay for yourself',
      'Anything beyond the daily cap or after the benefit period expires',
    ],
    timingTrap:
      'The elimination period is an unpaid waiting window, often 30–100 days, that starts only once a claim is opened. A benefit period that ends mid-stay is a common reason a funded plan quietly stops being funded — this app models both.',
    nextStep:
      'Find the policy documents and record the daily benefit, elimination period, benefit period and any inflation rider. Enter them as an income source so the projection stops the benefit at the right month.',
    sourceNote: 'Policy structure varies by contract. Read the schedule of benefits.',
  },
];
