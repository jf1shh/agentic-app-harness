'use client';

import React, { useState } from 'react';
import { SuitcaseModel, searchByBrand, lookupByBarcode } from '../utils/suitcaseDatabase';

interface Props {
  onSelect: (model: SuitcaseModel) => void;
}

// Text-based stand-in for the source app's camera barcode/credit-card
// scanner: type a brand/model name to search the 64-model catalog, or paste
// a barcode number (>= 8 digits) for an exact lookup. The pure lookup logic
// (searchByBrand, lookupByBarcode) is fully unit-tested in
// suitcaseDatabase.test.ts; this component is thin wiring on top of it.
export default function SuitcaseFinder({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SuitcaseModel[]>([]);
  const [barcodeMiss, setBarcodeMiss] = useState(false);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setBarcodeMiss(false);

    const digitsOnly = value.replace(/[\s-]/g, '');
    if (/^\d{8,}$/.test(digitsOnly)) {
      const match = lookupByBarcode(digitsOnly);
      if (match) {
        setResults([match]);
        return;
      }
      setResults([]);
      setBarcodeMiss(true);
      return;
    }

    setResults(searchByBrand(value));
  };

  const handleSelect = (model: SuitcaseModel) => {
    onSelect(model);
    setQuery(`${model.brand} — ${model.model}`);
    setResults([]);
    setBarcodeMiss(false);
  };

  return (
    <div>
      <label htmlFor="suitcase-finder" className="label">Find a suitcase (brand, model, or barcode)</label>
      <input
        id="suitcase-finder"
        className="input-field"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="e.g. Rimowa, or scan/paste a barcode number"
        autoComplete="off"
      />
      {barcodeMiss && (
        <p style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No suitcase matches that barcode yet — try searching by brand instead.
        </p>
      )}
      {results.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {results.map((m) => (
            <li key={`${m.brand}|${m.model}`}>
              <button
                type="button"
                onClick={() => handleSelect(m)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', gap: '8px',
                }}
              >
                <span>{m.brand} — {m.model}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{m.l}×{m.w}×{m.h} cm</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
