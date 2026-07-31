'use client';

import type { RunwayYear } from '@/lib/engine/runway';
import { formatCents } from '@/lib/format';
import { DOLLAR_BASIS_LABEL } from '@/lib/dollarBasis';

/**
 * Hand-rolled inline SVG rather than a charting dependency: it keeps the bundle
 * small and, more importantly, keeps the accessibility story controllable. The
 * chart is decorative — the table beneath it carries the same information and is
 * always present, never hidden behind a toggle.
 */
export function RunwayChart({ years }: { years: readonly RunwayYear[] }) {
  if (years.length === 0) return null;

  const width = 640;
  const height = 200;
  const padding = 8;
  const maxAssets = Math.max(...years.map((y) => y.assetsEndCents), 1);
  const barWidth = (width - padding * 2) / years.length;

  return (
    <>
      <svg
        className="chart no-print"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Savings remaining at the end of each year, from ${formatCents(
          years[0].assetsEndCents,
        )} in year 1 to ${formatCents(years[years.length - 1].assetsEndCents)} in year ${
          years[years.length - 1].year
        }. The same figures are in the table below.`}
      >
        {years.map((y, i) => {
          const barHeight = Math.max(2, (y.assetsEndCents / maxAssets) * (height - padding * 2));
          return (
            <rect
              key={y.year}
              x={padding + i * barWidth + barWidth * 0.15}
              y={height - padding - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              fill={y.assetsEndCents > 0 ? '#1e5f4f' : '#9a3412'}
            />
          );
        })}
      </svg>

      {/* Spec §11.9: the runway compounds the care escalator and the income
          COLA, so these bars are in future dollars. Saying so on the chart is
          the whole point — the figures are inflation-loaded, not missing it. */}
      <p className="hint" data-testid="runway-dollar-basis">
        {DOLLAR_BASIS_LABEL.nominal}
      </p>

      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">
            Year by year care costs, income, shortfall and savings remaining
          </caption>
          <thead>
            <tr>
              <th scope="col">Year</th>
              <th scope="col" className="num">Cost of care</th>
              <th scope="col" className="num">Income</th>
              <th scope="col" className="num">Gap</th>
              <th scope="col" className="num">Savings left</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year}>
                <th scope="row">{y.year}</th>
                <td className="num">{formatCents(y.careCostCents)}</td>
                <td className="num">{formatCents(y.incomeCents)}</td>
                <td className="num">{formatCents(y.shortfallCents)}</td>
                <td className="num">{formatCents(y.assetsEndCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
