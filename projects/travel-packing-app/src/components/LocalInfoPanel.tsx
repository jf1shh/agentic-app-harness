'use client';

import React, { useState, useEffect } from 'react';
import { getCurrencyForCountry, fetchExchangeRates, convertCost, ConvertedCost } from '../services/currency';
import { fetchTravelAdvisory, TravelAdvisory } from '../services/advisory';

export interface LocalInfoLeg {
  destination: string;
  countryCode: string | null;
}

interface LegInfo {
  destination: string;
  countryCode: string;
  costs: ConvertedCost[] | null;
  currency: string | null;
  advisory: TravelAdvisory | null;
}

interface Props {
  legs: LocalInfoLeg[];
}

const DISPLAY_COSTS = ['meal', 'coffee', 'taxi', 'laundry'];

// Shows typical-cost currency conversions and a GOV.UK travel advisory
// summary for EVERY destination leg of the trip (not just the primary one),
// each rendered under its own destination heading so a multi-leg trip's
// figures are never ambiguous about which leg they describe -- see "Two
// Bases On One Page Is a Defect Even When Both Are Right" in
// .agents/AGENTS.md §6. A leg whose country never resolved is skipped
// (best-effort, matching the prior single-leg behaviour): it renders
// nothing rather than a broken section, and the whole panel disappears if
// no leg has anything to show.
export default function LocalInfoPanel({ legs }: Props) {
  const [legInfos, setLegInfos] = useState<LegInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // Effect identity is the resolved (destination, countryCode) pairs, not
  // the legs array reference, so an unrelated re-render (e.g. typing in an
  // unrelated field) doesn't re-fetch every leg's data.
  const legsKey = legs.map((l) => `${l.destination}|${l.countryCode ?? ''}`).join('||');

  useEffect(() => {
    const resolvable = legs.filter(
      (l): l is LocalInfoLeg & { countryCode: string } => !!l.countryCode
    );

    // Nothing to fetch. Deliberately not clearing legInfos here (that would
    // be a synchronous setState in the effect body, which
    // react-hooks/set-state-in-effect flags): the render guard just below
    // already returns null whenever every leg lacks a country code, so a
    // stale legInfos value from a prior, different leg set can never
    // actually render.
    if (resolvable.length === 0) return;

    let active = true;

    (async () => {
      setLoading(true);

      const results = await Promise.all(
        resolvable.map(async (leg): Promise<LegInfo> => {
          const targetCurrency = getCurrencyForCountry(leg.countryCode);

          const [rates, advisory] = await Promise.all([
            targetCurrency && targetCurrency !== 'USD'
              ? fetchExchangeRates('USD', [targetCurrency]).catch(() => null)
              : Promise.resolve(null),
            fetchTravelAdvisory(leg.countryCode),
          ]);

          const hasRate = !!(targetCurrency && rates?.rates?.[targetCurrency]);
          const costs = hasRate
            ? DISPLAY_COSTS.map((key) => convertCost(key, rates!.rates[targetCurrency!], targetCurrency!))
            : null;

          return {
            destination: leg.destination,
            countryCode: leg.countryCode,
            costs,
            currency: hasRate ? targetCurrency : null,
            advisory,
          };
        })
      );

      if (!active) return;
      setLegInfos(results);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsKey]);

  if (legs.length === 0 || legs.every((l) => !l.countryCode)) return null;

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h2>Local Info</h2>
        <p style={{ color: 'var(--text-muted)' }}>Loading currency and travel advisory…</p>
      </div>
    );
  }

  const visibleLegInfos = legInfos.filter((l) => l.costs || l.advisory);
  if (visibleLegInfos.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
      <h2>Local Info</h2>

      {visibleLegInfos.map((leg, i) => (
        <div
          key={`${leg.destination}-${leg.countryCode}`}
          style={{
            marginTop: i === 0 ? '16px' : '20px',
            paddingTop: i === 0 ? 0 : '20px',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}
        >
          {visibleLegInfos.length > 1 && <h3 style={{ marginBottom: '4px' }}>{leg.destination}</h3>}

          {leg.costs && leg.currency && (
            <div style={{ marginTop: '12px' }}>
              <h4>Typical Costs ({leg.currency})</h4>
              <ul style={{ paddingLeft: '20px' }}>
                {leg.costs.map((c) => (
                  <li key={c.label}>{c.label}: {c.display}</li>
                ))}
              </ul>
            </div>
          )}

          {leg.advisory && (
            <div style={{ marginTop: '12px' }}>
              <h4>Travel Advisory</h4>
              <p>{leg.advisory.summary}</p>
              <a href={leg.advisory.url} target="_blank" rel="noopener noreferrer">Read full advisory on GOV.UK</a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
