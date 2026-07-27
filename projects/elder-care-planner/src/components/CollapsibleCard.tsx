'use client';

import type { ReactNode } from 'react';

interface Props {
  /** Stable id. The heading gets `${id}-heading`, which the jump nav targets. */
  id: string;
  /** The section heading, rendered as the `h2` inside the `summary`. */
  title: ReactNode;
  /**
   * What this section says while it is closed — a figure read from engine
   * output, not a label. A disclosure control that only repeats its own
   * heading costs a click to learn anything (spec §5.1a).
   */
  status: ReactNode;
  /** Kept off the printed page. Mirrors the `no-print` class on plain cards. */
  noPrint?: boolean;
  children: ReactNode;
}

/**
 * One collapsible section of the plan.
 *
 * The `open` attribute is deliberately never passed as a prop. This page
 * re-renders on every keystroke, and a React-controlled `open={false}` would
 * slam a section shut while someone was typing in it. Leaving `open` out of the
 * props entirely means React never touches the attribute, so the DOM keeps
 * whatever the user (or the jump nav, or the print handler) last set — which is
 * exactly the desired behaviour and needs no state to achieve.
 *
 * `data-print-open` marks this as a section the print handler may open; see
 * `usePrintExpansion`.
 */
export function CollapsibleCard({ id, title, status, noPrint = false, children }: Props) {
  return (
    <section
      className={noPrint ? 'card collapsible no-print' : 'card collapsible'}
      aria-labelledby={`${id}-heading`}
    >
      <details data-print-open data-testid={`section-${id}`}>
        <summary className="section-summary">
          <h2 id={`${id}-heading`}>{title}</h2>
          <span className="section-status" data-testid={`status-${id}`}>
            {status}
          </span>
        </summary>
        <div className="section-body">{children}</div>
      </details>
    </section>
  );
}
