'use client';

import React, { useState, useRef, useEffect } from 'react';
import { searchLocations, LocationSuggestion } from '../services/weatherApi';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const DEBOUNCE_MS = 300;

// Real-time destination suggestions as the user types, via Open-Meteo's
// geocoding search (searchLocations) — never Nominatim, which forbids
// client-side autocomplete. Debounced so it doesn't fire on every keystroke.
export default function DestinationAutocomplete({ value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchLocations(next);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (s: LocationSuggestion) => {
    const label = s.country ? `${s.name}, ${s.country}` : s.name;
    onChange(label);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor="dest" className="label">Destination</label>
      <input
        id="dest"
        className="input-field"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && (
        <ul
          role="listbox"
          aria-label="Destination suggestions"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px',
            listStyle: 'none', padding: 0, backgroundColor: 'var(--bg, #fff)',
            border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden',
          }}
        >
          {suggestions.map((s, i) => (
            <li key={`${s.name}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none',
                  border: 'none', cursor: 'pointer', display: 'block',
                }}
              >
                {s.name}{s.country ? `, ${s.country}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
