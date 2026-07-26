/**
 * "Questions to ask before you sign."
 *
 * The research (§2.1) found families are blindsided by fee structures they did
 * not know existed. Modelling those costs helps; arming someone at the moment of
 * negotiation helps more, and costs nothing to build.
 *
 * Static content, keyed by care type. No computation, no data licensing risk.
 */
import type { CareType } from '../schemas';
import { RESIDENTIAL_CARE_TYPES, HOURLY_CARE_TYPES } from '../schemas';

export interface QuestionGroup {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly questions: readonly string[];
}

const RESIDENTIAL_QUESTIONS: QuestionGroup = {
  id: 'residential',
  title: 'Ask the community before you sign',
  intro:
    'These are the questions that surface the costs which are not on the brochure. Ask for the answers in writing.',
  questions: [
    'What triggers a care-level reassessment, and who decides the outcome?',
    'May I see the full care-level tier schedule, with the price of every tier?',
    'What were your actual rate increases in each of the last three years?',
    'Is the community fee refundable if we leave within 30, 60 or 90 days?',
    'Exactly which services are included in the base rate, and which are billed separately?',
    'Is there a coordination or monitoring fee if we bring in an outside aide or therapist?',
    'What happens if my parent needs more care than this community can provide?',
    'How much notice do you give before a rate increase takes effect?',
    'What is your policy if we run out of private funds and apply for Medicaid?',
    'Who pays for incontinence supplies, medication management and transport to appointments?',
  ],
};

const HOURLY_QUESTIONS: QuestionGroup = {
  id: 'in_home',
  title: 'Ask the home care agency before you sign',
  intro:
    'Hourly care looks simple until the minimums, holidays and travel time land on the invoice.',
  questions: [
    'Is there a minimum number of hours per visit or per week?',
    'What are your holiday, weekend and overnight rates?',
    'Do you charge for the caregiver’s travel time or mileage?',
    'What happens if the assigned caregiver is sick — do you guarantee a replacement?',
    'How much notice do I need to give to reduce or cancel hours without being charged?',
    'Are your caregivers employees or contractors, and who carries the liability insurance?',
    'What specific tasks are your caregivers not permitted to do?',
    'How do rates change if my parent’s needs increase?',
  ],
};

const ADULT_DAY_QUESTIONS: QuestionGroup = {
  id: 'adult_day',
  title: 'Ask the adult day programme before you enrol',
  intro: 'Day programmes vary enormously in what the daily rate actually includes.',
  questions: [
    'Is transport to and from the centre included in the daily rate?',
    'Are meals and snacks included?',
    'What is the staff-to-participant ratio, and does it change through the day?',
    'Can you manage my parent’s specific medical and mobility needs?',
    'What is the policy on days we cancel or my parent is unwell — are we still charged?',
    'Is there a minimum number of days per week?',
  ],
};

/**
 * The referred-out territory. Framing this as "what to ask a professional" is
 * both more useful and far safer than a wrong eligibility answer (§1.1).
 */
export const ATTORNEY_QUESTIONS: QuestionGroup = {
  id: 'attorney',
  title: 'Ask an elder law attorney',
  intro:
    'This app deliberately does not model Medicaid eligibility or tax positions. These are the questions worth paying an hour of professional time for.',
  questions: [
    'Given any gifts or property transfers in the last five years, what is our Medicaid lookback exposure?',
    'If one parent needs a nursing home and one stays at home, what do the spousal impoverishment rules protect?',
    'Are the powers of attorney for healthcare and finances current and valid in this state?',
    'Should the house be handled differently before applying for Medicaid, and what are the risks either way?',
    'Is a personal care agreement between my parent and a family caregiver appropriate here?',
    'What documentation should we be keeping now that we would need for a Medicaid application later?',
    'If siblings split support, who can claim the medical expense deduction, and does a multiple support declaration apply?',
  ],
};

/** Questions relevant to the given care type, plus the attorney list. */
export function questionsFor(careType: CareType): readonly QuestionGroup[] {
  const groups: QuestionGroup[] = [];

  if (RESIDENTIAL_CARE_TYPES.includes(careType)) {
    groups.push(RESIDENTIAL_QUESTIONS);
  } else if (HOURLY_CARE_TYPES.includes(careType)) {
    groups.push(HOURLY_QUESTIONS);
  } else if (careType === 'adult_day_care') {
    groups.push(ADULT_DAY_QUESTIONS);
  }

  groups.push(ATTORNEY_QUESTIONS);
  return groups;
}
