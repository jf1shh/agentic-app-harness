'use client';

import React from 'react';
import { ACTIVITY_OPTIONS, resolveActivity } from '../utils/activity';

interface Props {
  duration: number;
  destination: string;
  dailyActivities: (string | null)[];
  setDailyActivities: (activities: (string | null)[]) => void;
}

// Lets a user tag each trip day with an activity (Beach/Hike/Ski/Formal/...)
// instead of one blanket default for the whole trip. wardrobeEngine already
// branches per-day on DayItinerary.activity (evening-outfit selection,
// hot-weather color exclusion); this is the input UI for that per-day value.
// A day with no explicit tag shows its destination-guessed activity as the
// selected pill (resolveActivity), so the guess is visible and overridable.
export default function DailyActivityPicker({ duration, destination, dailyActivities, setDailyActivities }: Props) {
  if (duration <= 0) return null;

  const setDay = (dayIndex: number, value: string) => {
    const next = [...dailyActivities];
    const current = next[dayIndex] ?? null;
    const currentResolved = resolveActivity(current, destination);
    // Toggle off: revert the Casual pill back to auto-guess; any other pill
    // to an explicit empty string, matching the source app's behaviour.
    next[dayIndex] = currentResolved === value ? (value === '' ? null : '') : value;
    setDailyActivities(next);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label className="label">Day-by-Day Activities</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '12px', marginTop: '8px' }}>
        {Array.from({ length: duration }).map((_, dayIndex) => {
          const resolved = resolveActivity(dailyActivities[dayIndex] ?? null, destination);
          return (
            <div
              key={dayIndex}
              role="group"
              aria-label={`Day ${dayIndex + 1}`}
              style={{ padding: '10px', border: '1px solid var(--border)', borderRadius: '8px' }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Day {dayIndex + 1}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {ACTIVITY_OPTIONS.map((opt) => {
                  const isSelected = resolved === opt.value;
                  return (
                    <button
                      key={opt.value || 'casual'}
                      type="button"
                      onClick={() => setDay(dayIndex, opt.value)}
                      aria-pressed={isSelected}
                      style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? '#fff' : 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
