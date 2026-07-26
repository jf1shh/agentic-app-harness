'use client';

import { useId } from 'react';

interface CurrencyInputProps {
  label: string;
  hint?: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
}

/** Dollars in the UI, integer cents in the model. */
export function CurrencyInput({ label, hint, valueCents, onChangeCents }: CurrencyInputProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>
        {label}
        {hint ? <span className="hint">{hint}</span> : null}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step={100}
        inputMode="numeric"
        value={valueCents === 0 ? '' : String(Math.round(valueCents / 100))}
        placeholder="0"
        onChange={(e) => {
          const dollars = Number(e.target.value);
          onChangeCents(Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0);
        }}
      />
    </div>
  );
}

interface NumberInputProps {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export function NumberInput({
  label,
  hint,
  value,
  min = 0,
  max = 1000,
  step = 1,
  onChange,
}: NumberInputProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>
        {label}
        {hint ? <span className="hint">{hint}</span> : null}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)));
        }}
      />
    </div>
  );
}

interface SelectInputProps {
  label: string;
  hint?: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function SelectInput({ label, hint, value, options, onChange }: SelectInputProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>
        {label}
        {hint ? <span className="hint">{hint}</span> : null}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
