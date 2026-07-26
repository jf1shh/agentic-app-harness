'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  INITIAL_STATE,
  US_STATES,
  buildPlan,
  breakEvenScenarios,
  makeContributors,
  type PlannerState,
} from '@/lib/plannerState';
import { computePlan, breakEvenBetween, aideHourlyRateCents } from '@/lib/engine/plan';
import { buildExplanations } from '@/lib/explain/build';
import { CARE_TYPE_LABELS } from '@/lib/data/costOfCare';
import type { CareType, Contributor, SplitMethod } from '@/lib/schemas';
import type { ExplanationSet } from '@/lib/explain/types';
import { CurrencyInput, NumberInput, SelectInput } from '@/components/Inputs';
import { ResultsPanel } from '@/components/ResultsPanel';
import { RefineCostPanel } from '@/components/RefineCostPanel';
import { BreakEvenPanel } from '@/components/BreakEvenPanel';
import { SplitPanel } from '@/components/SplitPanel';
import { BenefitsPanel } from '@/components/BenefitsPanel';
import { QuestionsPanel } from '@/components/QuestionsPanel';
import { SummaryPanel } from '@/components/SummaryPanel';
import { ExplainProvider } from '@/components/ExplainProvider';
import { ExplainDrawer } from '@/components/ExplainDrawer';
import { MethodologyPanel } from '@/components/MethodologyPanel';

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
  sensitivity: null,
};

export default function Home() {
  const [state, setState] = useState<PlannerState>(INITIAL_STATE);
  const [largeText, setLargeText] = useState(false);

  const update = useCallback((patch: Partial<PlannerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textsize = largeText ? 'large' : 'normal';
  }, [largeText]);

  const plan = useMemo(() => buildPlan(state), [state]);
  const planResult = useMemo(() => computePlan(plan), [plan]);
  const breakEven = useMemo(() => {
    const { inHome, residential } = breakEvenScenarios(state);
    return breakEvenBetween(inHome, residential);
  }, [state]);

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
          })
        : EMPTY_EXPLANATIONS,
    [plan, planResult, breakEven, state.stateCode, state.compareHoursPerWeek, state.contributors],
  );

  const isResidential = RESIDENTIAL.includes(state.careType);
  const isHourly = HOURLY.includes(state.careType);

  const onContributorCountChange = (count: number) => {
    update({ contributorCount: count, contributors: makeContributors(count, state.contributors) });
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
              options={(Object.keys(CARE_TYPE_LABELS) as CareType[]).map((c) => ({
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

        <div className="no-print">
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
            onHoursChange={(v) => update({ compareHoursPerWeek: v })}
            onHousingCarryChange={(v) => update({ housingCarryMonthlyCents: v })}
          />
        </div>

        {planResult.split ? (
          <SplitPanel
            split={planResult.split}
            contributors={state.contributors}
            method={state.splitMethod}
            onMethodChange={(m: SplitMethod) => update({ splitMethod: m })}
            onContributorChange={onContributorChange}
          />
        ) : null}

        <MethodologyPanel />

        <div className="no-print">
          <BenefitsPanel />
          <QuestionsPanel careType={state.careType} />
        </div>

        {planResult.active ? (
          <SummaryPanel
            result={planResult.active}
            split={planResult.split}
            breakEven={breakEven}
            state={state}
          />
        ) : null}

        <div className="no-print">
          <button type="button" onClick={() => window.print()}>
            Print this summary
          </button>
        </div>

        <p className="privacy-note no-print">
          <strong>Nothing typed here leaves this device.</strong> There is no account, no email
          field and no analytics, and this page makes no network requests with any of these
          figures — it can be checked by turning off the network, or by watching the network tab
          in browser developer tools. That is deliberate: a planner nobody trusts gets fed
          approximate numbers, and approximate numbers make every figure it produces worthless.
          Even so, please use first names or labels rather than full legal names, and do not enter
          account numbers.
        </p>
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
