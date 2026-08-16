'use client';

import React, { useState, useRef, useEffect } from 'react';
import { searchLocations, LocationSuggestion } from '../services/weatherApi';

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
}

const DEBOUNCE_MS = 300;

// Real-time destination suggestions as the user types, via Open-Meteo's
// geocoding search (searchLocations) — never Nominatim, which forbids
// client-side autocomplete. Debounced so it doesn't fire on every keystroke,
// and guarded so a slow response for an older query can never overwrite the
// results of a newer one. The listbox renders in normal flow (not an
// absolutely-positioned overlay) so an open list never covers the controls
// beneath it — the previous overlay could sit on top of "+ Add Another
// Destination" and steal the click meant for that button. `id`/`label` default
// to the original single-destination shape so every existing call site is
// unchanged; a multi-destination trip renders one instance per leg and must
// pass a distinct id/label per instance, or every extra leg's <input> would
// collide on the same "dest" id.
export default function DestinationAutocomplete({ value, onChange, id = 'dest', label = 'Destination' }: Props) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  // Index of the keyboard-highlighted option, or -1 when none.
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic sequence so only the latest request may apply its results.
  const requestSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const closeList = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (next: string) => {
    onChange(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      const results = await searchLocations(next);
      if (seq !== requestSeqRef.current) return; // a newer query superseded this one
      // Focus may have moved to another control while the fetch was in
      // flight — never open the list over what the user is now doing.
      if (document.activeElement !== inputRef.current) return;
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIndex(results.length > 0 ? 0 : -1);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (s: LocationSuggestion) => {
    const labelText = s.country ? `${s.name}, ${s.country}` : s.name;
    onChange(labelText);
    setSuggestions([]);
    closeList();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeList();
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Tab') {
      closeList();
    }
  };

  const listboxId = `${id}-listbox`;
  const activeDescendant = activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        className="input-field"
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(closeList, 150)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          style={{
            marginTop: '4px', maxHeight: '260px', overflowY: 'auto',
            listStyle: 'none', padding: 0, backgroundColor: 'var(--bg, #fff)',
            border: '1px solid var(--border)', borderRadius: '8px',
          }}
        >
          {suggestions.map((s, i) => (
            <li key={`${s.name}-${i}`} id={`${id}-option-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(s)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none',
                  border: 'none', cursor: 'pointer', display: 'block',
                  backgroundColor: i === activeIndex ? 'var(--surface, #f1f5f9)' : 'transparent',
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
