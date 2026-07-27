'use client';

import {
  FACILITY_DIMENSIONS,
  type FacilityDimension,
  type FacilityNote,
  type FacilityWeight,
  type CareType,
} from '@/lib/schemas';
import {
  MAX_FACILITIES,
  MAX_SCORE,
  MAX_WEIGHT,
  WEIGHT_LABELS,
  formatComposite,
  type CostConsequence,
  type DimensionRow,
  type FacilityFit,
} from '@/lib/engine/fit';
import { CARE_TYPE_LABELS, SELECTABLE_CARE_TYPES } from '@/lib/data/costOfCare';
import { formatCents, formatMonths } from '@/lib/format';
import { CurrencyInput, SelectInput, TextInput, TextAreaInput } from './Inputs';
import { WhyButton } from './WhyButton';
import { FacilityPhotos } from './FacilityPhotos';
import { CollapsibleCard } from './CollapsibleCard';

interface Props {
  facilities: readonly FacilityNote[];
  weights: readonly FacilityWeight[];
  fits: readonly FacilityFit[];
  rows: readonly DimensionRow[];
  /** Keyed by facility id — what pricing the plan at each community would do. */
  consequences: Readonly<Record<string, CostConsequence>>;
  focusedFacilityId: string | null;
  onFocus: (id: string) => void;
  onChange: (id: string, patch: Partial<FacilityNote>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onWeightChange: (dimension: FacilityDimension, weight: number) => void;
  onAdopt: (id: string) => void;
}

const WAITLIST_OPTIONS = [
  { value: 'unknown', label: 'Not asked' },
  { value: 'none', label: 'Space available now' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

const SCORE_OPTIONS = [
  { value: '', label: 'Not assessed' },
  ...Array.from({ length: MAX_SCORE }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} out of ${MAX_SCORE}`,
  })),
];

const WEIGHT_OPTIONS = Array.from({ length: MAX_WEIGHT + 1 }, (_, i) => ({
  value: String(i),
  label: WEIGHT_LABELS[i],
}));

/** One dimension's score as a bar that is never the only encoding. */
function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="score-empty">Not assessed</span>;
  }
  return (
    <span className="score">
      <span className="score-text">
        {score}
        <span className="visually-hidden"> out of {MAX_SCORE}</span>
      </span>
      <span className="score-bar" aria-hidden="true">
        <span className="score-fill" style={{ width: `${(score / MAX_SCORE) * 100}%` }} />
      </span>
    </span>
  );
}

/**
 * What pricing the plan at this community would do to it, in one sentence.
 *
 * Neutral register per spec §5.4 — the reader may be the sibling who did not
 * go on the tour, and "you would be paying more" is not a sentence that helps
 * that conversation.
 */
function ConsequenceLine({
  facility,
  consequence,
}: {
  facility: FacilityNote;
  consequence: CostConsequence | undefined;
}) {
  if (!consequence) return null;
  if (facility.quotedMonthlyCents === undefined) {
    return (
      <p className="hint" data-testid={`consequence-${facility.id}`}>
        No monthly price has been recorded for this community, so the plan cannot yet be priced
        against it. The quoted rate is the single most useful figure to bring back from a tour.
      </p>
    );
  }

  const { monthlyDeltaCents, runwayDeltaMonths } = consequence;
  const sameCost = monthlyDeltaCents === 0;
  const costPhrase = sameCost
    ? "matches the plan's current monthly figure"
    : `${formatCents(Math.abs(monthlyDeltaCents))} a month ${
        monthlyDeltaCents > 0 ? 'above' : 'below'
      } the plan's current figure`;

  let runwayPhrase: string;
  if (runwayDeltaMonths === null) {
    runwayPhrase =
      consequence.facility.depletionMonth === null
        ? 'On this pricing the savings are not projected to run out within the horizon.'
        : 'The current plan is not projected to run out of savings within the horizon, so the two cannot be compared as a number of months.';
  } else if (runwayDeltaMonths === 0) {
    runwayPhrase = 'The projection ends in the same month either way.';
  } else {
    runwayPhrase = `That ${
      runwayDeltaMonths < 0 ? 'shortens' : 'lengthens'
    } the projection by ${formatMonths(Math.abs(runwayDeltaMonths))}.`;
  }

  return (
    <p className="consequence" data-testid={`consequence-${facility.id}`}>
      <strong>{facility.label}</strong> {costPhrase}. {runwayPhrase}
    </p>
  );
}

function FacilityCard({
  facility,
  fit,
  consequence,
  totalPhotos,
  onChange,
  onRemove,
  onAdopt,
  onFocus,
}: {
  facility: FacilityNote;
  fit: FacilityFit | undefined;
  consequence: CostConsequence | undefined;
  totalPhotos: number;
  onChange: (id: string, patch: Partial<FacilityNote>) => void;
  onRemove: (id: string) => void;
  onAdopt: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const setRating = (dimension: FacilityDimension, patch: { score?: number; note?: string }) => {
    const existing = facility.ratings.find((r) => r.dimension === dimension);
    const next = { dimension, ...existing, ...patch };
    onChange(facility.id, {
      ratings: existing
        ? facility.ratings.map((r) => (r.dimension === dimension ? next : r))
        : [...facility.ratings, next],
    });
  };

  return (
    <article className="option-card" data-testid={`facility-${facility.id}`}>
      <div className="grid">
        <TextInput
          label="What is this place called?"
          value={facility.label}
          maxLength={80}
          onChange={(v) => onChange(facility.id, { label: v || 'Community' })}
        />
        <SelectInput
          label="Kind of care"
          value={facility.careType}
          options={SELECTABLE_CARE_TYPES.map((c) => ({ value: c, label: CARE_TYPE_LABELS[c] }))}
          onChange={(v) => onChange(facility.id, { careType: v as CareType })}
        />
        <TextInput
          label="Roughly where"
          hint="A landmark or a drive time. Not a street address."
          value={facility.locality ?? ''}
          maxLength={80}
          placeholder="20 minutes from the family"
          onChange={(v) => onChange(facility.id, { locality: v || undefined })}
        />
        <TextInput
          label="Visited on"
          hint="However it is easiest to remember it."
          value={facility.visitedOn ?? ''}
          maxLength={40}
          placeholder="Tuesday morning"
          onChange={(v) => onChange(facility.id, { visitedOn: v || undefined })}
        />
        <TextInput
          label="Who visited"
          hint="A first name or a label."
          value={facility.visitedBy ?? ''}
          maxLength={80}
          onChange={(v) => onChange(facility.id, { visitedBy: v || undefined })}
        />
        <SelectInput
          label="Waiting list"
          value={facility.waitlist}
          options={WAITLIST_OPTIONS}
          onChange={(v) => onChange(facility.id, { waitlist: v as FacilityNote['waitlist'] })}
        />
      </div>

      <h4>What they quoted</h4>
      <div className="grid">
        <CurrencyInput
          label="Monthly rate"
          hint="The base rate on the sheet they handed over."
          valueCents={facility.quotedMonthlyCents ?? 0}
          onChangeCents={(c) => onChange(facility.id, { quotedMonthlyCents: c || undefined })}
        />
        <CurrencyInput
          label="Care level surcharge"
          hint="The current tier, if they named one."
          valueCents={facility.quotedTierCents ?? 0}
          onChangeCents={(c) => onChange(facility.id, { quotedTierCents: c || undefined })}
        />
        <CurrencyInput
          label="Move-in or community fee"
          hint="One-time, and usually not refundable."
          valueCents={facility.quotedCommunityFeeCents ?? 0}
          onChangeCents={(c) =>
            onChange(facility.id, { quotedCommunityFeeCents: c || undefined })
          }
        />
      </div>

      <h4>How it seemed</h4>
      <div className="grid">
        {FACILITY_DIMENSIONS.map(({ dimension, label, hint }) => {
          const rating = facility.ratings.find((r) => r.dimension === dimension);
          return (
            <div key={dimension}>
              <SelectInput
                label={`${label} at ${facility.label}`}
                hint={hint}
                value={rating?.score === undefined ? '' : String(rating.score)}
                options={SCORE_OPTIONS}
                onChange={(v) =>
                  setRating(dimension, { score: v === '' ? undefined : Number(v) })
                }
              />
              <TextInput
                label={`Note about ${label.toLowerCase()} at ${facility.label}`}
                value={rating?.note ?? ''}
                maxLength={400}
                placeholder="What stood out"
                onChange={(v) => setRating(dimension, { note: v || undefined })}
              />
            </div>
          );
        })}
      </div>

      <TextAreaInput
        label={`Anything else worth remembering about ${facility.label}`}
        hint="The things that will have blurred together by next week."
        value={facility.notes ?? ''}
        maxLength={2000}
        rows={4}
        onChange={(v) => onChange(facility.id, { notes: v || undefined })}
      />

      <FacilityPhotos facility={facility} totalPhotos={totalPhotos} onChange={onChange} />

      <p className="result-line">
        <span>Weighted score</span>{' '}
        <strong data-testid={`composite-${facility.id}`}>
          {formatComposite(fit?.compositeScore ?? null)}
        </strong>
        <WhyButton id="facility-fit" onActivate={() => onFocus(facility.id)} />
      </p>
      {fit && fit.unrated.length > 0 ? (
        <p className="hint" data-testid={`excluded-${facility.id}`}>
          Left out of that score because nothing was recorded:{' '}
          {FACILITY_DIMENSIONS.filter((d) => fit.unrated.includes(d.dimension))
            .map((d) => d.label.toLowerCase())
            .join(', ')}
          .
        </p>
      ) : null}
      {fit && fit.notWeighted.length > 0 ? (
        <p className="hint" data-testid={`unweighted-${facility.id}`}>
          Assessed but not counted, because it was weighted &ldquo;{WEIGHT_LABELS[0]}&rdquo;:{' '}
          {FACILITY_DIMENSIONS.filter((d) => fit.notWeighted.includes(d.dimension))
            .map((d) => d.label.toLowerCase())
            .join(', ')}
          .
        </p>
      ) : null}

      <ConsequenceLine facility={facility} consequence={consequence} />

      <div className="row-actions">
        <button
          type="button"
          onClick={() => onAdopt(facility.id)}
          data-testid={`adopt-${facility.id}`}
        >
          Price the plan at {facility.label}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onRemove(facility.id)}
          data-testid={`remove-facility-${facility.id}`}
        >
          Remove {facility.label}
        </button>
      </div>
    </article>
  );
}

/**
 * The facility shortlist (spec §11.2).
 *
 * A family tours four to six communities in a fortnight, under time pressure,
 * and by the end cannot reconstruct which one had the staff they liked. This
 * panel is where the tour gets written down, and — through "price the plan at
 * this community" — where a preference finally meets its cost.
 *
 * Two things it deliberately is not:
 *
 *  - **Not a directory.** Nothing here is searched for, fetched, or supplied by
 *    anyone. Every community on the list is one the family walked into. The
 *    §1.1 non-goal against facility directories and referral revenue is what
 *    makes this app's cost comparisons believable, and it is not weakened by a
 *    notebook.
 *  - **Not a verdict.** The cards stay in the order they were entered, nothing
 *    is sorted by score, and no community is labelled best. Eight subjective
 *    scores averaged together do not carry that authority, and a family that
 *    disagrees with a ranking will stop believing the cost figures too.
 */
export function FacilityPanel({
  facilities,
  weights,
  fits,
  rows,
  consequences,
  focusedFacilityId,
  onFocus,
  onChange,
  onAdd,
  onRemove,
  onWeightChange,
  onAdopt,
}: Props) {
  const weightFor = (dimension: FacilityDimension) =>
    weights.find((w) => w.dimension === dimension)?.weight ?? 1;

  // Counts, never a ranking. This panel refuses to name a best community on
  // purpose (see the closing note below), and a status line that crowned one
  // would overturn that editorial decision from the outside (spec §5.1a).
  const status =
    facilities.length === 0
      ? 'Nothing added yet'
      : `${facilities.length} ${facilities.length === 1 ? 'community' : 'communities'} visited`;

  return (
    <CollapsibleCard id="facilities" title="The places actually visited" status={status}>
      <p>
        Four communities in a fortnight blur together, and the one detail that decides it — how
        staff spoke to residents when nobody was watching — is the first thing to go. This is where
        a tour gets written down while it is still fresh, and where a preference can be checked
        against what it costs.
      </p>
      <p className="hint">
        Nothing here is looked up, fetched, or supplied by any community or referral service. Every
        entry below is one somebody walked into and typed up afterwards.
      </p>

      {facilities.length === 0 ? (
        <p className="callout">
          No communities have been added yet. Adding one after each tour keeps the impressions
          separable — they stop being separable surprisingly quickly.
        </p>
      ) : null}

      {facilities.length > 0 ? (
        <>
          <h3>What matters to this family</h3>
          <p className="hint">
            These weights apply to every community on the list, which is what makes the scores
            comparable. A dimension set to &ldquo;{WEIGHT_LABELS[0]}&rdquo; is left out of the
            scoring entirely and is named as left out.
          </p>
          <div className="grid">
            {FACILITY_DIMENSIONS.map(({ dimension, label }) => (
              <SelectInput
                key={dimension}
                label={`How much does ${label.toLowerCase()} matter?`}
                value={String(weightFor(dimension))}
                options={WEIGHT_OPTIONS}
                onChange={(v) => onWeightChange(dimension, Number(v))}
              />
            ))}
          </div>
        </>
      ) : null}

      {facilities.map((facility) => (
        <FacilityCard
          key={facility.id}
          facility={facility}
          fit={fits.find((f) => f.facilityId === facility.id)}
          consequence={consequences[facility.id]}
          totalPhotos={facilities.reduce((sum, f) => sum + f.photoIds.length, 0)}
          onChange={onChange}
          onRemove={onRemove}
          onAdopt={onAdopt}
          onFocus={onFocus}
        />
      ))}

      {facilities.length < MAX_FACILITIES ? (
        <button type="button" className="secondary" onClick={onAdd} data-testid="add-facility">
          Add a community
        </button>
      ) : (
        <p className="hint">
          This list holds {MAX_FACILITIES} communities. Beyond that they stop being comparable by
          reading, which is the only thing this page is for.
        </p>
      )}

      {facilities.length > 1 ? (
        <>
          <h3>Side by side</h3>
          <div className="table-wrap">
            <table data-testid="facility-comparison">
              <caption className="visually-hidden">
                Every dimension scored, for each community on the shortlist, with the weight
                applied to it
              </caption>
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  <th scope="col">Weight</th>
                  {facilities.map((f) => (
                    <th scope="col" key={f.id}>
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.dimension}>
                    <th scope="row">{row.label}</th>
                    <td>{WEIGHT_LABELS[row.weight]}</td>
                    {row.scores.map((s) => (
                      <td key={s.facilityId}>
                        <ScoreBar score={s.score} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="step-result">
                  <th scope="row">Weighted score</th>
                  <td aria-hidden="true" />
                  {facilities.map((f) => (
                    <td key={f.id} data-testid={`table-composite-${f.id}`}>
                      {formatComposite(
                        fits.find((fit) => fit.facilityId === f.id)?.compositeScore ?? null,
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Monthly rate quoted</th>
                  <td aria-hidden="true" />
                  {facilities.map((f) => (
                    <td key={f.id}>
                      {f.quotedMonthlyCents === undefined
                        ? 'Not recorded'
                        : formatCents(f.quotedMonthlyCents)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="hint">
            The communities stay in the order they were added, and none of them is marked as the
            best one. Cost is worked out; a feeling about a dining room is not, and blending the
            two into a single verdict would make both harder to argue with.
          </p>
        </>
      ) : null}

      {focusedFacilityId === null ? null : (
        <p className="visually-hidden" data-testid="focused-facility">
          {focusedFacilityId}
        </p>
      )}
    </CollapsibleCard>
  );
}
