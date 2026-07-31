'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  INITIAL_STATE,
  US_STATES,
  buildPlan,
  breakEvenScenarios,
  makeContributors,
  makeFacility,
  withFacilityAdopted,
  ilScenarios,
  makeILOption,
  MAX_IL_OPTIONS,
  type PlannerState,
} from '@/lib/plannerState';
import { computePlan, breakEvenBetween, aideHourlyRateCents } from '@/lib/engine/plan';
import {
  MAX_FACILITIES,
  compareFacilities,
  costConsequence,
  dimensionRows,
  type CostConsequence,
} from '@/lib/engine/fit';
import { clearPhotos } from '@/lib/photos';
import { FacilityPanel } from '@/components/FacilityPanel';
import { summariseLedger } from '@/lib/engine/ledger';
import {
  browserStorage,
  clearPlannerState,
  loadPlannerState,
  savePlannerState,
} from '@/lib/storage';
import { buildExplanations } from '@/lib/explain/build';
import { CARE_TYPE_LABELS, SELECTABLE_CARE_TYPES } from '@/lib/data/costOfCare';
import { ILComparisonPanel } from '@/components/ILComparisonPanel';
import { projectILVariants } from '@/lib/engine/buyin';
import type {
  CareType,
  Contributor,
  FacilityDimension,
  FacilityNote,
  ILOption,
  LedgerEntry,
  SplitMethod,
} from '@/lib/schemas';
import type { ExplanationSet } from '@/lib/explain/types';
import { CurrencyInput, NumberInput, SelectInput } from '@/components/Inputs';
import { ResultsPanel } from '@/components/ResultsPanel';
import { RefineCostPanel } from '@/components/RefineCostPanel';
import { BreakEvenPanel } from '@/components/BreakEvenPanel';
import { SplitPanel } from '@/components/SplitPanel';
import { BenefitsPanel } from '@/components/BenefitsPanel';
import { QuestionsPanel } from '@/components/QuestionsPanel';
import { SummaryPanel } from '@/components/SummaryPanel';
import { LedgerPanel } from '@/components/LedgerPanel';
import { ExplainProvider } from '@/components/ExplainProvider';
import { ExplainDrawer } from '@/components/ExplainDrawer';
import { MethodologyPanel } from '@/components/MethodologyPanel';
import { SectionNav, type NavSection } from '@/components/SectionNav';
import { StartingGuidePanel } from '@/components/StartingGuidePanel';
import { listenForPrint, openForPrint, restoreAfterPrint } from '@/lib/printExpansion';

const RESIDENTIAL: readonly CareType[] = [
  'assisted_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
];
const HOURLY: readonly CareType[] = ['in_home_homemaker', 'in_home_health_aide'];

/** Before any scenario exists there is nothing to explain, but the shape holds. */
const EMPTY_EXPLANATIONS: ExplanationSet = {
  'base-rate': null,
  'all-in': null,
  'first-month': null,
  'monthly-gap': null,
  runway: null,
  'break-even': null,
  split: null,
  ledger: null,
  sensitivity: null,
  'facility-fit': null,
};

export default function Home() {
  const [state, setState] = useState<PlannerState>(INITIAL_STATE);
  const [largeText, setLargeText] = useState(false);
  // Nothing is read from storage during render: the server renders this page to
  // static HTML, and reaching for localStorage there would either crash or
  // produce markup that disagrees with the first client render.
  const [restored, setRestored] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [confirmingErase, setConfirmingErase] = useState(false);
  // Which community's weighted score the "?" would explain. One
  // `ExplanationId` covers all of them, so the click that opens the drawer sets
  // this first (see WhyButton's `onActivate`).
  const [focusedFacilityId, setFocusedFacilityId] = useState<string | null>(null);

  const update = useCallback((patch: Partial<PlannerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textsize = largeText ? 'large' : 'normal';
  }, [largeText]);

  // Restore once, on mount.
  //
  // This is the cascading render `set-state-in-effect` warns about, and it is
  // unavoidable rather than careless: the page is a static export, so the stored
  // plan cannot be read while rendering without producing server markup that
  // disagrees with the first client render. One extra render on mount is the
  // price of persistence that survives hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storage = browserStorage();
    if (storage) {
      const result = loadPlannerState(storage);
      if (result.status === 'restored') setState(result.state);
      if (result.status === 'invalid') setRestoreFailed(true);
    }
    setRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save on change, debounced so a burst of typing is one write. Guarded on
  // `restored` — without it the first save would fire with the defaults and
  // overwrite the family's stored plan before the load had run.
  useEffect(() => {
    if (!restored) return;
    const storage = browserStorage();
    if (!storage) return;
    const timer = setTimeout(() => savePlannerState(storage, state), 300);
    return () => clearTimeout(timer);
  }, [state, restored]);

  // Flush immediately when the page goes away.
  //
  // The debounce above means the last few hundred milliseconds of typing are
  // still pending when someone closes the tab, switches app, or hits reload —
  // and that edit would be lost with no indication it had been. `pagehide`
  // covers navigation and closing; `visibilitychange` covers a phone being
  // backgrounded, where `pagehide` is not dependable.
  const latest = useRef(state);
  const canSave = useRef(false);
  useEffect(() => {
    latest.current = state;
    canSave.current = restored;
  }, [state, restored]);

  useEffect(() => {
    const flush = () => {
      if (!canSave.current) return;
      const storage = browserStorage();
      if (storage) savePlannerState(storage, latest.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // A marker for tests: proof that the restore has finished, so an E2E fill
  // cannot land in the window before it and be overwritten.
  useEffect(() => {
    if (restored) document.documentElement.dataset.planready = 'true';
  }, [restored]);

  // Every section after the results is collapsed by default, and a collapsed
  // `<details>` prints collapsed — so printing has to open them first or the
  // family meeting summary reaches the meeting as a heading (spec §5.1a).
  useEffect(() => listenForPrint(), []);

  const printSummary = () => {
    // Done synchronously around `window.print()` rather than left to the
    // `beforeprint` listener above: a print started from this button must not
    // race the event, and `window.print()` can begin painting before a listener
    // has run.
    openForPrint();
    window.print();
    restoreAfterPrint();
  };

  const eraseEverything = () => {
    const storage = browserStorage();
    if (storage) clearPlannerState(storage);
    // Tour photos live in IndexedDB rather than localStorage, so clearing the
    // plan does not touch them. "Forget everything on this device" has to mean
    // everything, or the control is a lie on a shared computer.
    void clearPhotos();
    setState(INITIAL_STATE);
    setRestoreFailed(false);
    setConfirmingErase(false);
  };

  const plan = useMemo(() => buildPlan(state), [state]);
  const planResult = useMemo(() => computePlan(plan), [plan]);
  const breakEven = useMemo(() => {
    const { inHome, residential } = breakEvenScenarios(state);
    return breakEvenBetween(inHome, residential);
  }, [state]);

  // Every option is projected against the SAME plan — the shared income, assets
  // and assumptions above — which is what makes the three contracts comparable
  // at all (spec §6.5b.4).
  const ilProjections = useMemo(
    () => projectILVariants(plan, ilScenarios(state)),
    [plan, state],
  );

  // The shortlist, scored against one shared set of weights (spec §11.2).
  const facilityFits = useMemo(
    () => compareFacilities(state.facilities, state.facilityWeights),
    [state.facilities, state.facilityWeights],
  );
  const facilityRows = useMemo(
    () => dimensionRows(state.facilities, state.facilityWeights),
    [state.facilities, state.facilityWeights],
  );

  /**
   * What pricing the plan at each community would do to it (spec §11.2.3).
   *
   * Each community is run through exactly the same engines as the live plan,
   * on a copy of the state with its quoted figures adopted. Nothing is
   * recomputed by hand here — the comparison is between two proper engine
   * results, which is what keeps the "14 months shorter" sentence honest.
   */
  const facilityConsequences = useMemo(() => {
    const baseline = {
      allInMonthlyCents: planResult.active?.cost.allInMonthlyCents ?? 0,
      depletionMonth: planResult.active?.runway.depletionMonth ?? null,
    };
    const out: Record<string, CostConsequence> = {};
    for (const facility of state.facilities) {
      const priced = computePlan(buildPlan(withFacilityAdopted(state, facility)));
      out[facility.id] = costConsequence(baseline, {
        allInMonthlyCents: priced.active?.cost.allInMonthlyCents ?? 0,
        depletionMonth: priced.active?.runway.depletionMonth ?? null,
      });
    }
    return out;
  }, [state, planResult.active]);

  // Reconciled against the shares the split panel is displaying, so "expected by
  // now" always matches the number the family agreed on rather than a second
  // opinion about it.
  const ledgerSummary = useMemo(() => {
    const shares: Record<string, number> = {};
    for (const share of planResult.split?.shares ?? []) {
      shares[share.contributorId] = share.monthlyCents;
    }
    return summariseLedger({
      entries: state.ledger,
      contributors: state.contributors,
      monthlySharesCents: shares,
      monthsElapsed: state.monthsElapsed,
    });
  }, [planResult.split, state.ledger, state.contributors, state.monthsElapsed]);

  // Derivations are built from engine output, never recomputed here — a second
  // implementation of the same arithmetic would drift silently (spec §6.10).
  const explanations = useMemo(
    () =>
      planResult.active
        ? buildExplanations({
            plan,
            result: planResult.active,
            breakEven,
            breakEvenHourlyRateCents: aideHourlyRateCents(state.stateCode),
            breakEvenHoursPerWeek: state.compareHoursPerWeek,
            split: planResult.split,
            contributors: state.contributors,
            ledger: ledgerSummary,
            monthsElapsed: state.monthsElapsed,
            facilityFit:
              facilityFits.find((f) => f.facilityId === focusedFacilityId) ??
              facilityFits[0] ??
              null,
          })
        : EMPTY_EXPLANATIONS,
    [
      plan,
      planResult,
      breakEven,
      state.stateCode,
      state.compareHoursPerWeek,
      state.contributors,
      state.monthsElapsed,
      ledgerSummary,
      facilityFits,
      focusedFacilityId,
    ],
  );

  const isResidential = RESIDENTIAL.includes(state.careType);
  const isHourly = HOURLY.includes(state.careType);

  // The jump bar lists what is actually on the page — an entry pointing at a
  // section that is not rendered is a broken link (spec §5.1a).
  //
  // These conditions deliberately mirror the render guards below rather than
  // restating them in a weaker form. `buildPlan` always produces at least one
  // scenario, so in practice every branch is taken; the point is that if the
  // guard below ever stops holding, the bar stops advertising the section in
  // the same commit rather than in whichever one notices. `sections.spec.ts`
  // asserts the two sets are equal rather than checking any one branch.
  const navSections = useMemo<readonly NavSection[]>(() => {
    const sections: NavSection[] = [
      { id: 'refine', label: 'Refine the cost' },
      { id: 'breakeven', label: 'Home or facility' },
    ];
    if (planResult.split) sections.push({ id: 'split', label: 'Sharing the cost' });
    sections.push(
      { id: 'ledger', label: 'What was paid' },
      { id: 'facilities', label: 'Places visited' },
      { id: 'il', label: 'Independent living' },
    );
    if (planResult.active) sections.push({ id: 'methodology', label: 'How it is worked out' });
    sections.push(
      { id: 'benefits', label: 'Public benefits' },
      { id: 'questions', label: 'Questions to ask' },
      { id: 'starting-guide', label: 'Where to start looking' },
    );
    if (planResult.active) sections.push({ id: 'summary', label: 'Family summary' });
    return sections;
  }, [planResult.split, planResult.active]);

  const onContributorCountChange = (count: number) => {
    update({ contributorCount: count, contributors: makeContributors(count, state.contributors) });
  };

  const onAddLedgerEntry = (entry: LedgerEntry) => {
    update({ ledger: [...state.ledger, entry] });
  };

  // Entries are kept when someone is removed from the list of contributors —
  // the payment was still made, and deleting a record of it is not the app's
  // call to make.
  const onRemoveLedgerEntry = (id: string) => {
    update({ ledger: state.ledger.filter((e) => e.id !== id) });
  };

  const onILOptionChange = (id: string, patch: Partial<ILOption>) => {
    update({
      ilOptions: state.ilOptions.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  };

  const onILOptionAdd = () => {
    if (state.ilOptions.length >= MAX_IL_OPTIONS) return;
    update({ ilOptions: [...state.ilOptions, makeILOption(state.ilOptions.length)] });
  };

  const onILOptionRemove = (id: string) => {
    update({ ilOptions: state.ilOptions.filter((o) => o.id !== id) });
  };

  const onFacilityChange = (id: string, patch: Partial<FacilityNote>) => {
    update({
      facilities: state.facilities.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const onFacilityAdd = () => {
    if (state.facilities.length >= MAX_FACILITIES) return;
    update({
      facilities: [...state.facilities, makeFacility(state.facilities.length, state.careType)],
    });
  };

  // The photo bytes are deliberately left in IndexedDB rather than swept here.
  // Removing a card is an editing action a family may well undo by re-adding
  // it, and destroying images on the way past would be a surprise; the erase
  // control is where deletion is promised, and where it happens.
  const onFacilityRemove = (id: string) => {
    update({ facilities: state.facilities.filter((f) => f.id !== id) });
    if (focusedFacilityId === id) setFocusedFacilityId(null);
  };

  const onFacilityWeightChange = (dimension: FacilityDimension, weight: number) => {
    const others = state.facilityWeights.filter((w) => w.dimension !== dimension);
    update({ facilityWeights: [...others, { dimension, weight }] });
  };

  const onFacilityAdopt = (id: string) => {
    const facility = state.facilities.find((f) => f.id === id);
    if (facility) setState((prev) => withFacilityAdopted(prev, facility));
  };

  const onContributorChange = (index: number, next: Contributor) => {
    const contributors = state.contributors.map((c, i) => (i === index ? next : c));
    update({ contributors });
  };

  return (
    <ExplainProvider explanations={explanations}>
      <header className="site">
        <div className="page">
          <div className="header-bar">
            <div>
              <h1>Elder Care Cost Planner</h1>
              <p>
                What care really costs, how long the money lasts, and how a family can share it.
              </p>
            </div>
            <button
              type="button"
              className="secondary no-print"
              onClick={() => setLargeText((v) => !v)}
              aria-pressed={largeText}
            >
              {largeText ? 'Normal text' : 'Larger text'}
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {/* Triage first: five fields, an answer in under a minute (spec §5.1). */}
        <section className="card no-print" aria-labelledby="triage-heading">
          <h2 id="triage-heading">Start here</h2>
          <p>
            Five questions. Everything after this is optional refinement — there is no sign-up and
            nothing is sent anywhere.
          </p>
          <div className="grid">
            <SelectInput
              label="Which state?"
              value={state.stateCode}
              options={US_STATES.map((s) => ({ value: s.code, label: s.name }))}
              onChange={(v) => update({ stateCode: v })}
            />
            <SelectInput
              label="What kind of care?"
              value={state.careType}
              options={SELECTABLE_CARE_TYPES.map((c) => ({
                value: c,
                label: CARE_TYPE_LABELS[c],
              }))}
              onChange={(v) => update({ careType: v as CareType })}
            />
            <CurrencyInput
              label="Their monthly income"
              hint="Social Security, pension, anything regular."
              valueCents={state.monthlyIncomeCents}
              onChangeCents={(cents) => update({ monthlyIncomeCents: cents })}
            />
            <CurrencyInput
              label="Savings available for care"
              hint="Cash and investments that could be spent. Leave out the house unless it would be sold."
              valueCents={state.liquidAssetsCents}
              onChangeCents={(cents) => update({ liquidAssetsCents: cents })}
            />
            <NumberInput
              label="How many family members will share the cost?"
              value={state.contributorCount}
              min={0}
              max={10}
              onChange={onContributorCountChange}
            />
          </div>
        </section>

        {planResult.active ? (
          <ResultsPanel
            result={planResult.active}
            breakEven={breakEven}
            split={planResult.split}
            careRecipientLabel={state.careRecipientLabel}
          />
        ) : null}

        {/* Everything below is collapsed on arrival, so the jump bar is how a
            reader gets to a section rather than scrolling for it. It sits after
            the answer because the answer is what §5.1 promises first. */}
        <SectionNav sections={navSections} />

        <RefineCostPanel
          state={state}
          isResidential={isResidential}
          isHourly={isHourly}
          onChange={update}
        />

        <BreakEvenPanel
          result={breakEven}
          hoursPerWeek={state.compareHoursPerWeek}
          housingCarryMonthlyCents={state.housingCarryMonthlyCents}
          homeCosts={{
            homeMortgageOrRentCents: state.homeMortgageOrRentCents,
            homeGroceriesCents: state.homeGroceriesCents,
            homeUtilitiesCents: state.homeUtilitiesCents,
            homePropertyTaxMonthlyCents: state.homePropertyTaxMonthlyCents,
            homeInsuranceMonthlyCents: state.homeInsuranceMonthlyCents,
            homeMaintenanceMonthlyCents: state.homeMaintenanceMonthlyCents,
            homeTransportCents: state.homeTransportCents,
          }}
          onHomeCostChange={(key, v) => update({ [key]: v })}
          hourlyRateCents={aideHourlyRateCents(state.stateCode)}
          onHoursChange={(v) => update({ compareHoursPerWeek: v })}
          onHousingCarryChange={(v) => update({ housingCarryMonthlyCents: v })}
        />

        {planResult.split ? (
          <SplitPanel
            split={planResult.split}
            contributors={state.contributors}
            method={state.splitMethod}
            onMethodChange={(m: SplitMethod) => update({ splitMethod: m })}
            onContributorChange={onContributorChange}
          />
        ) : null}

        <LedgerPanel
          summary={ledgerSummary}
          entries={state.ledger}
          contributors={state.contributors}
          monthsElapsed={state.monthsElapsed}
          onMonthsElapsedChange={(months) => update({ monthsElapsed: months })}
          onAddEntry={onAddLedgerEntry}
          onRemoveEntry={onRemoveLedgerEntry}
        />

        <FacilityPanel
          facilities={state.facilities}
          weights={state.facilityWeights}
          fits={facilityFits}
          rows={facilityRows}
          consequences={facilityConsequences}
          focusedFacilityId={focusedFacilityId}
          onFocus={setFocusedFacilityId}
          onChange={onFacilityChange}
          onAdd={onFacilityAdd}
          onRemove={onFacilityRemove}
          onWeightChange={onFacilityWeightChange}
          onAdopt={onFacilityAdopt}
        />

        <ILComparisonPanel
          options={state.ilOptions}
          projections={ilProjections}
          liquidAssetsCents={state.liquidAssetsCents}
          onChange={onILOptionChange}
          onAdd={onILOptionAdd}
          onRemove={onILOptionRemove}
        />

        <MethodologyPanel />

        <BenefitsPanel />
        <QuestionsPanel careType={state.careType} />

        <StartingGuidePanel />

        {planResult.active ? (
          <SummaryPanel
            result={planResult.active}
            split={planResult.split}
            breakEven={breakEven}
            state={state}
          />
        ) : null}

        <div className="no-print">
          <button type="button" onClick={printSummary}>
            Print this summary
          </button>
        </div>

        {restoreFailed ? (
          <p className="callout no-print" data-testid="restore-failed">
            A saved plan was found on this device but could not be read — it may have been written
            by a newer version of this page, or edited by hand. Rather than load part of it and
            present the result as though it were complete, this page has started from its defaults.
          </p>
        ) : null}

        <div className="privacy-note no-print">
          <p>
            <strong>Nothing typed here leaves this device.</strong> There is no account, no email
            field and no analytics, and this page makes no network requests with any of these
            figures — it can be checked by turning off the network, or by watching the network tab
            in browser developer tools. That is deliberate: a planner nobody trusts gets fed
            approximate numbers, and approximate numbers make every figure it produces worthless.
            Even so, please use first names or labels rather than full legal names, and do not enter
            account numbers.
          </p>
          <p>
            <strong>These figures are saved in this browser</strong> so the plan is still here on
            the next visit. That is the same device and the same browser only — nothing is
            synced, and nothing is uploaded. On a shared or borrowed computer, erase it before
            handing it back.
          </p>
          {confirmingErase ? (
            <p>
              <strong>Erase the plan, the ledger and every figure entered, on this device?</strong>{' '}
              This cannot be undone.{' '}
              <button type="button" onClick={eraseEverything} data-testid="confirm-erase">
                Yes, erase it
              </button>{' '}
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmingErase(false)}
              >
                Keep it
              </button>
            </p>
          ) : (
            <p>
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmingErase(true)}
                data-testid="erase"
              >
                Forget everything on this device
              </button>
            </p>
          )}
        </div>
      </main>

      <footer className="site page">
        <p>
          An estimator, not financial, legal, tax or medical advice. Medicaid eligibility and tax
          positions are deliberately not modelled — those need a professional.
        </p>
      </footer>

      <ExplainDrawer />
    </ExplainProvider>
  );
}
