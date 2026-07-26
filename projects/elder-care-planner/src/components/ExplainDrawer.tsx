'use client';

import { useEffect, useRef } from 'react';
import type { ExplanationId } from '@/lib/explain/types';
import { useExplain } from './ExplainProvider';
import { ExplanationBody } from './ExplanationBody';

const FOCUSABLE =
  'a[href], button:not([disabled]):not([tabindex="-1"]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The side panel a question mark opens.
 *
 * Keyboard behaviour is not decoration here: this app is used by older adults
 * and by people reading a phone one-handed in a hospital corridor. Escape
 * closes, Tab stays inside the panel while it is open, and focus returns to the
 * control that opened it so the reader does not lose their place on a long page.
 */
export function ExplainDrawer() {
  const { get, openId, close } = useExplain();
  const explanation = openId ? get(openId) : null;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastOpenRef = useRef<ExplanationId | null>(null);

  useEffect(() => {
    if (!openId) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openId, close]);

  // Send focus back to the "?" that opened the panel, so a keyboard user
  // resumes where they were rather than at the top of the document.
  useEffect(() => {
    if (openId) {
      lastOpenRef.current = openId;
      return;
    }
    const previous = lastOpenRef.current;
    if (!previous) return;
    lastOpenRef.current = null;
    document.querySelector<HTMLElement>(`[data-why="${previous}"]`)?.focus();
  }, [openId]);

  if (!explanation) return null;

  return (
    <div className="drawer-root no-print" data-testid="explain-drawer">
      <button
        type="button"
        className="drawer-backdrop"
        tabIndex={-1}
        aria-label="Close the explanation"
        onClick={close}
      />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        ref={panelRef}
      >
        <div className="drawer-head">
          <h2 id="drawer-title">{explanation.title}</h2>
          <button type="button" className="secondary" ref={closeRef} onClick={close}>
            Close
          </button>
        </div>
        {/* A scrolling region has to be reachable by keyboard, or a reader who
            cannot use a pointer cannot reach the bottom of a long derivation
            (WCAG 2.1.1). */}
        <div className="drawer-body" tabIndex={0}>
          <ExplanationBody explanation={explanation} />
        </div>
      </div>
    </div>
  );
}
