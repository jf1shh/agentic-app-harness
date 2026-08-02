'use client';

import type { CareCoverageSlot, Contributor } from '@/lib/schemas';
import {
  DAYS,
  DAY_LABELS,
  BLOCKS,
  BLOCK_LABELS,
  slotAt,
  uncoveredHoursPerWeek,
} from '@/lib/careCoverage';

interface Props {
  coverage: readonly CareCoverageSlot[];
  contributors: readonly Contributor[];
  onChange: (next: readonly CareCoverageSlot[]) => void;
}

/**
 * A typical-week coverage grid (spec §11.15) — who is around for each block
 * of a typical day, not a calendar of dated shifts. Its purpose is to make
 * `providesUnpaidHoursPerWeek` checkable rather than a number typed with no
 * way to reconstruct where it came from; see `SplitPanel`, which reads
 * `coveredHoursForContributor` off the same `coverage` this component edits.
 */
export function CareCoverageGrid({ coverage, contributors, onChange }: Props) {
  const validIds = contributors.map((c) => c.id);
  const uncoveredHours = uncoveredHoursPerWeek(coverage, validIds);

  const assign = (day: (typeof DAYS)[number], block: (typeof BLOCKS)[number], value: string) => {
    const without = coverage.filter((s) => !(s.day === day && s.block === block));
    const next = value ? [...without, { day, block, contributorId: value }] : without;
    onChange(next);
  };

  if (contributors.length === 0) {
    return (
      <p className="hint">
        Add family members above to lay out who typically covers which part of the week.
      </p>
    );
  }

  return (
    <div data-testid="care-coverage-grid">
      <div className="table-wrap">
        <table className="coverage-table">
          <caption className="visually-hidden">
            Who typically covers each part of a usual week
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Time of day</span>
              </th>
              {DAYS.map((day) => (
                <th scope="col" key={day}>
                  {DAY_LABELS[day].slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BLOCKS.map((block) => (
              <tr key={block}>
                <th scope="row">{BLOCK_LABELS[block]}</th>
                {DAYS.map((day) => {
                  const slot = slotAt(coverage, day, block);
                  const id = `coverage-${day}-${block}`;
                  return (
                    <td key={day}>
                      <label htmlFor={id} className="visually-hidden">
                        {BLOCK_LABELS[block]}, {DAY_LABELS[day]}
                      </label>
                      <select
                        id={id}
                        data-testid={id}
                        value={slot?.contributorId ?? ''}
                        onChange={(e) => assign(day, block, e.target.value)}
                      >
                        <option value="">—</option>
                        {contributors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint" data-testid="care-coverage-uncovered">
        {uncoveredHours === 0
          ? 'Every block of a typical week has someone assigned.'
          : `${uncoveredHours} hours a week have no one assigned.`}
      </p>
    </div>
  );
}
