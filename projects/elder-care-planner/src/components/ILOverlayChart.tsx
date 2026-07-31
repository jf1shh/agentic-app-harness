'use client';

import type { ILVariantProjection } from '@/lib/engine/buyin';
import { formatCents } from '@/lib/format';
import { DOLLAR_BASIS_LABEL } from '@/lib/dollarBasis';
import { findDepletion, yearBoundaries, type Depletion } from '@/lib/engine/depletion';

/**
 * The Independent Living overlay chart (spec §6.5b.4).
 *
 * Hand-rolled inline SVG, matching RunwayChart: no charting dependency, and the
 * accessibility story stays controllable. The table below carries the same
 * figures and is never hidden behind a toggle.
 *
 * Two series per option, answering two different questions:
 *
 *   - the SOLID LINE is liquid assets remaining — "when does the money run out"
 *   - the BAND above it is assets plus the refund if the family left that month
 *     — "what is this worth if it does not work out"
 *
 * The band is the refund, so it collapses onto the line as the ladder steps
 * down. That is not decoration: because the refund is never netted into the
 * depletion line (§6.5b.3), the option with the *best* refund terms draws the
 * *lowest* line, and lines alone would misrepresent the comparison the chart
 * exists for. Per the spec the band is not optional and not behind a toggle.
 *
 * Colour is never the sole encoder — each option also carries its own line
 * style and a direct label in the legend and the table.
 */

/** Line styles carry the option identity for anyone who cannot use hue. */
const OPTION_STYLES = [
  { stroke: '#1e5f4f', dash: '', name: 'solid' },
  { stroke: '#9a3412', dash: '7 4', name: 'dashed' },
  { stroke: '#3730a3', dash: '2 3', name: 'dotted' },
] as const;

function styleFor(index: number) {
  return OPTION_STYLES[index % OPTION_STYLES.length];
}

const WIDTH = 720;
const HEIGHT = 260;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

function describe(projections: readonly ILVariantProjection[], months: number): string {
  const parts = projections.map((p) => {
    const last = p.assetsEndByMonthCents[p.assetsEndByMonthCents.length - 1] ?? 0;
    const first = p.assetsEndByMonthCents[0] ?? 0;
    const affordability = p.isAffordable
      ? ''
      : ' This option cannot be afforded from the plan’s liquid assets.';
    // §11.8: the depletion month is the thing the chart exists to surface, so
    // it belongs in the accessible description too — a marker only sighted
    // readers can find is not the feature being asked for.
    const depletion = findDepletion(p.assetsEndByMonthCents);
    const runsOut = depletion
      ? ` Savings run out in year ${depletion.year}, at month ${depletion.month}.`
      : ' Savings last the whole projection.';
    return `${p.label} starts at ${formatCents(first)} after its entry fee and ends at ${formatCents(
      last,
    )}.${runsOut}${affordability}`;
  });
  return `Savings remaining month by month over ${months} months, one line per independent living option. ${parts.join(
    ' ',
  )} The shaded band above each line is what would be refunded on leaving that month. The same figures are in the table below.`;
}

export function ILOverlayChart({
  projections,
}: {
  projections: readonly ILVariantProjection[];
}) {
  const withCurves = projections.filter((p) => p.assetsEndByMonthCents.length > 0);
  if (withCurves.length === 0) return null;

  const months = Math.max(...withCurves.map((p) => p.assetsEndByMonthCents.length));

  // The y-axis has to hold the tallest band, not just the tallest line, or a
  // refund would be clipped off the top and read as though it were smaller.
  const maxValue = Math.max(
    1,
    ...withCurves.flatMap((p) =>
      p.assetsEndByMonthCents.map(
        (assets, i) => assets + (p.refundAtExitByMonthCents[i] ?? 0),
      ),
    ),
  );

  const plotW = WIDTH - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;
  const x = (monthIndex: number) =>
    PAD_L + (months <= 1 ? 0 : (monthIndex / (months - 1)) * plotW);
  const y = (cents: number) => PAD_T + plotH - (cents / maxValue) * plotH;

  // Year ticks and depletion markers both read off the plotted series (§11.8),
  // so neither can disagree with the curve the reader is looking at.
  const boundaries = yearBoundaries(months);
  const depletions = withCurves
    .map((projection, styleIndex) => ({
      projection,
      styleIndex,
      depletion: findDepletion(projection.assetsEndByMonthCents),
    }))
    .filter(
      (d): d is { projection: ILVariantProjection; styleIndex: number; depletion: Depletion } =>
        d.depletion !== null,
    );

  const linePath = (series: readonly number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');

  /** The band is the region between the line and the line plus its refund. */
  const bandPath = (p: ILVariantProjection) => {
    const top = p.assetsEndByMonthCents.map(
      (assets, i) => assets + (p.refundAtExitByMonthCents[i] ?? 0),
    );
    const forward = top
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`)
      .join(' ');
    const back = [...p.assetsEndByMonthCents]
      .map((v, i) => ({ v, i }))
      .reverse()
      .map(({ v, i }) => `L${x(i).toFixed(2)},${y(v).toFixed(2)}`)
      .join(' ');
    return `${forward} ${back} Z`;
  };

  return (
    <>
      <ul className="il-legend" data-testid="il-legend">
        {withCurves.map((p, i) => {
          const style = styleFor(i);
          return (
            <li key={p.scenarioId}>
              <svg width="34" height="10" aria-hidden="true" focusable="false">
                <line
                  x1="1"
                  y1="5"
                  x2="33"
                  y2="5"
                  stroke={style.stroke}
                  strokeWidth="2.5"
                  strokeDasharray={p.isAffordable ? style.dash : '3 3'}
                />
              </svg>
              <span>
                {p.label} — {style.name} line
                {p.isAffordable ? '' : ', shown faded: entry fee is above liquid assets'}
              </span>
            </li>
          );
        })}
      </ul>

      <svg
        className="chart no-print"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={describe(withCurves, months)}
        data-testid="il-overlay-chart"
      >
        {/* Year boundaries (spec §11.8): a subtle guideline plus a tick, drawn
            UNDER the bands and lines so they never compete with the data. The
            series stays monthly — annual sampling is the option §6.5b.3
            records as rejected. */}
        {boundaries.map((b) => (
          <g key={`year-${b.year}`} data-testid={`il-year-${b.year}`}>
            <line
              x1={x(b.monthIndex)}
              y1={PAD_T}
              x2={x(b.monthIndex)}
              y2={PAD_T + plotH}
              stroke="#111827"
              strokeWidth="1"
              strokeOpacity="0.12"
            />
            <line
              x1={x(b.monthIndex)}
              y1={PAD_T + plotH}
              x2={x(b.monthIndex)}
              y2={PAD_T + plotH + 4}
              stroke="#111827"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <text
              x={x(b.monthIndex)}
              y={HEIGHT - 8}
              fontSize="11"
              fill="#111827"
              fillOpacity="0.75"
              textAnchor="middle"
            >
              {`Yr ${b.year}`}
            </text>
          </g>
        ))}

        {/* Bands first, so the lines always read on top of them. An option that
            cannot be afforded gets no band — there is no refund to weigh when
            the entry fee cannot be paid in the first place. */}
        {withCurves.map((p, i) =>
          p.isAffordable && p.refundAtExitByMonthCents.some((r) => r > 0) ? (
            <path
              key={`band-${p.scenarioId}`}
              d={bandPath(p)}
              fill={styleFor(i).stroke}
              fillOpacity="0.17"
              stroke="none"
              data-testid={`il-band-${p.scenarioId}`}
            />
          ) : null,
        )}

        {withCurves.map((p, i) => {
          const style = styleFor(i);
          return (
            <path
              key={`line-${p.scenarioId}`}
              d={linePath(p.assetsEndByMonthCents)}
              fill="none"
              stroke={style.stroke}
              strokeWidth={p.isAffordable ? 2.5 : 1.75}
              strokeDasharray={p.isAffordable ? style.dash : '3 3'}
              strokeOpacity={p.isAffordable ? 1 : 0.55}
              data-testid={`il-line-${p.scenarioId}`}
            />
          );
        })}

        {/* Depletion markers (spec §11.8), on top of the lines because this is
            the event the chart exists to make findable. Positioned at the month
            the series actually reaches zero — never snapped to the nearest year
            label, or the marker would contradict the curve beneath it. */}
        {depletions.map(({ projection, depletion, styleIndex }) => (
          <g
            key={`depletion-${projection.scenarioId}`}
            data-testid={`il-depletion-${projection.scenarioId}`}
            data-month={depletion.month}
            data-year={depletion.year}
          >
            <line
              x1={x(depletion.monthIndex)}
              y1={PAD_T}
              x2={x(depletion.monthIndex)}
              y2={PAD_T + plotH}
              stroke={styleFor(styleIndex).stroke}
              strokeWidth="1.5"
              strokeDasharray="2 3"
              strokeOpacity="0.8"
            />
            <circle
              cx={x(depletion.monthIndex)}
              cy={y(0)}
              r={4}
              fill={styleFor(styleIndex).stroke}
            />
          </g>
        ))}

        <line
          x1={PAD_L}
          y1={PAD_T + plotH}
          x2={WIDTH - PAD_R}
          y2={PAD_T + plotH}
          stroke="#111827"
          strokeWidth="1"
        />
        <text x={PAD_L} y={HEIGHT - 8} fontSize="12" fill="#111827">
          Month 1
        </text>
        <text x={WIDTH - PAD_R} y={HEIGHT - 8} fontSize="12" fill="#111827" textAnchor="end">
          Month {months}
        </text>
      </svg>

      {/* The readout §11.8 exists for: "oops, out of funds after six years",
          in words, for every option — including the ones that do not run out,
          because a silent option is indistinguishable from an unanswered one. */}
      <ul className="hint" data-testid="il-depletion-readout">
        {withCurves.map((p) => {
          const depletion = findDepletion(p.assetsEndByMonthCents);
          return (
            <li key={`readout-${p.scenarioId}`} data-testid={`il-readout-${p.scenarioId}`}>
              {depletion
                ? `${p.label}: savings run out in year ${depletion.year} (month ${depletion.month} of ${months}).`
                : `${p.label}: savings last the full ${months} months projected.`}
            </li>
          );
        })}
      </ul>

      {/* Spec §11.9: this overlay reads its series verbatim from the runway
          engine, so it carries the same escalators and the same basis. */}
      <p className="hint" data-testid="il-dollar-basis">
        {DOLLAR_BASIS_LABEL.nominal}
      </p>
    </>
  );
}

/**
 * The chart's text equivalent, and a table in its own right.
 *
 * Reads `assetsEndByYearCents` and `refundAtExitByYearCents`, which are the
 * monthly series sampled at year boundaries (§6.5b.3) — so this table cannot
 * disagree with the curve above it.
 */
export function ILComparisonTable({
  projections,
}: {
  projections: readonly ILVariantProjection[];
}) {
  if (projections.length === 0) return null;
  const years = Math.max(...projections.map((p) => p.assetsEndByYearCents.length), 0);
  if (years === 0) return null;

  return (
    <div className="table-wrap">
      <table>
        <caption className="visually-hidden">
          Savings remaining and refund on leaving, at the end of each year, for every independent
          living option
        </caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            {projections.map((p) => (
              <th scope="col" className="num" key={p.scenarioId}>
                {p.label}
                <br />
                <span className="muted">savings left / refund on leaving</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: years }, (_, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              {projections.map((p) => (
                <td className="num" key={p.scenarioId}>
                  {formatCents(p.assetsEndByYearCents[i] ?? 0)}
                  {' / '}
                  {formatCents(p.refundAtExitByYearCents[i] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
