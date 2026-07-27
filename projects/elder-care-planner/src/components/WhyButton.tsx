'use client';

import type { ExplanationId } from '@/lib/explain/types';
import { useExplain } from './ExplainProvider';

/**
 * The question mark that sits beside a figure and opens its derivation.
 *
 * The visible glyph is hidden from assistive technology so the button's name is
 * the whole question ("How is the monthly gap after income worked out?") rather
 * than a punctuation mark — a screen reader user hearing "question mark, button"
 * eleven times down a page has been given nothing.
 */
export function WhyButton({
  id,
  onActivate,
}: {
  id: ExplanationId;
  /**
   * Run before the panel opens. Needed where one `ExplanationId` covers several
   * subjects — the facility shortlist builds `facility-fit` for whichever
   * community is in focus, so the click has to move the focus before the drawer
   * reads the derivation.
   */
  onActivate?: () => void;
}) {
  const { get, open, openId } = useExplain();
  const explanation = get(id);
  if (!explanation) return null;

  return (
    <button
      type="button"
      className="why no-print"
      data-why={id}
      data-testid={`why-${id}`}
      aria-label={explanation.question}
      aria-haspopup="dialog"
      aria-expanded={openId === id}
      title={explanation.question}
      onClick={() => {
        onActivate?.();
        open(id);
      }}
    >
      <span aria-hidden="true">?</span>
    </button>
  );
}
