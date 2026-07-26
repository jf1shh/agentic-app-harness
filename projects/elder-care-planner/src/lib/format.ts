/**
 * Display formatting.
 *
 * The spec bans point estimates where a range is the honest answer (§5.3), so
 * duration formatting is deliberately coarse — "about 6 years", not "74 months"
 * — and a band renders as a band.
 */

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatCentsPrecise(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercent(rate: number, digits = 0): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

/** A single duration in months, rendered in plain language. */
export function formatMonths(months: number | null): string {
  if (months === null) return 'indefinitely';
  if (months < 12) return months === 1 ? '1 month' : `${months} months`;
  const years = months / 12;
  if (years < 2) return 'about a year';
  return `about ${years.toFixed(1).replace(/\.0$/, '')} years`;
}

/**
 * A runway range. Null bounds mean the money is not projected to run out within
 * the horizon, which is a materially different answer from "0 months" and must
 * not be rendered as an empty chart.
 */
export function formatRunwayBand(
  lowMonths: number | null,
  highMonths: number | null,
): string {
  if (lowMonths === null || highMonths === null) {
    return 'Income covers the cost — savings are not projected to run out';
  }
  const lowYears = (lowMonths / 12).toFixed(1).replace(/\.0$/, '');
  const highYears = (highMonths / 12).toFixed(1).replace(/\.0$/, '');
  if (lowYears === highYears) return `roughly ${lowYears} years`;
  return `roughly ${lowYears}–${highYears} years`;
}

/** Stable ids without pulling in a uuid dependency. */
export function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
