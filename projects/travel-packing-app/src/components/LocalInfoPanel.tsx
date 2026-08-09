'use client';

import React, { useState, useEffect } from 'react';
import { getCurrencyForCountry, fetchExchangeRates, convertCost, ConvertedCost } from '../services/currency';
import { fetchTravelAdvisory, TravelAdvisory } from '../services/advisory';

interface Props {
  countryCode: string | null;
}

const DISPLAY_COSTS = ['meal', 'coffee', 'taxi', 'laundry'];

// Shows a few typical-cost currency conversions and a GOV.UK travel
// advisory summary for the geocoded destination country, once known.
export default function LocalInfoPanel({ countryCode }: Props) {
  const [costs, setCosts] = useState<ConvertedCost[] | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<TravelAdvisory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) return;

    let active = true;
    const targetCurrency = getCurrencyForCountry(countryCode);

    (async () => {
      setLoading(true);
      const [rates, travelAdvisory] = await Promise.all([
        targetCurrency && targetCurrency !== 'USD'
          ? fetchExchangeRates('USD', [targetCurrency]).catch(() => null)
          : Promise.resolve(null),
        fetchTravelAdvisory(countryCode),
      ]);

      if (!active) return;

      if (targetCurrency && rates?.rates?.[targetCurrency]) {
        setCurrency(targetCurrency);
        setCosts(DISPLAY_COSTS.map((key) => convertCost(key, rates.rates[targetCurrency], targetCurrency)));
      } else {
        setCurrency(null);
        setCosts(null);
      }
      setAdvisory(travelAdvisory);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [countryCode]);

  if (!countryCode) return null;
  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
        <h2>Local Info</h2>
        <p style={{ color: 'var(--text-muted)' }}>Loading currency and travel advisory…</p>
      </div>
    );
  }
  if (!costs && !advisory) return null;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
      <h2>Local Info</h2>

      {costs && currency && (
        <div style={{ marginTop: '16px' }}>
          <h3>Typical Costs ({currency})</h3>
          <ul style={{ paddingLeft: '20px' }}>
            {costs.map((c) => (
              <li key={c.label}>{c.label}: {c.display}</li>
            ))}
          </ul>
        </div>
      )}

      {advisory && (
        <div style={{ marginTop: '16px' }}>
          <h3>Travel Advisory</h3>
          <p>{advisory.summary}</p>
          <a href={advisory.url} target="_blank" rel="noopener noreferrer">Read full advisory on GOV.UK</a>
        </div>
      )}
    </div>
  );
}
