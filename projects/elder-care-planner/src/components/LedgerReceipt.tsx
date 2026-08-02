'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlannerLedgerEntry } from '@/lib/schemas';
import {
  capCheck,
  deleteReceipt,
  estimateUsage,
  loadReceipt,
  receiptFailureMessage,
  storeReceipt,
  type ReceiptFailure,
} from '@/lib/receipts';
import { makeId } from '@/lib/format';

/**
 * A receipt photo attached to one ledger entry (spec §11.14).
 *
 * One per entry, not a gallery — a receipt is a single document, unlike
 * §11.2's multi-photo facility tour notes. The bytes live in IndexedDB and
 * only the id reaches `PlannerState`; see the note at the top of
 * `lib/receipts.ts` for why this is a separate store from facility photos
 * rather than a shared one.
 */
export function LedgerReceipt({
  entry,
  totalReceipts,
  onChange,
}: {
  entry: PlannerLedgerEntry;
  /** Across the whole ledger — the cap is not per entry. */
  totalReceipts: number;
  onChange: (id: string, patch: Partial<PlannerLedgerEntry>) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<ReceiptFailure | null>(null);
  const [nearLimit, setNearLimit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const receiptId = entry.receiptPhotoId;

  // Load the stored blob for this entry's receipt id, and revoke the object
  // URL whenever the id changes or the component unmounts — leaking it would
  // hold the decoded image in memory for the life of the page.
  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    (async () => {
      if (!receiptId) {
        if (!cancelled) setUrl(null);
        return;
      }
      const blob = await loadReceipt(receiptId);
      if (cancelled) return;
      if (blob) {
        created = URL.createObjectURL(blob);
        setUrl(created);
      } else {
        setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [receiptId]);

  const onPick = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setProblem(null);

      const cap = capCheck(totalReceipts);
      if (!cap.ok) {
        setProblem(cap.reason);
        return;
      }

      const result = await storeReceipt(file, makeId('receipt'));
      if (!result.ok) {
        setProblem(result.reason);
      } else {
        onChange(entry.id, { receiptPhotoId: result.value });
      }

      const usage = await estimateUsage();
      setNearLimit(usage?.nearLimit ?? false);
      if (inputRef.current) inputRef.current.value = '';
    },
    [entry.id, totalReceipts, onChange],
  );

  const remove = useCallback(async () => {
    if (!receiptId) return;
    await deleteReceipt(receiptId);
    onChange(entry.id, { receiptPhotoId: undefined });
  }, [entry.id, receiptId, onChange]);

  if (receiptId) {
    return (
      <div className="receipt" data-testid={`receipt-${entry.id}`}>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            View receipt
          </a>
        ) : (
          <span className="hint">Loading receipt…</span>
        )}{' '}
        <button
          type="button"
          className="secondary small"
          onClick={() => {
            void remove();
          }}
        >
          Remove receipt
        </button>
      </div>
    );
  }

  return (
    <div className="receipt" data-testid={`receipt-input-${entry.id}`}>
      <label htmlFor={`receipt-input-${entry.id}`} className="visually-hidden">
        Attach a receipt for the {entry.date} payment
      </label>
      <input
        ref={inputRef}
        id={`receipt-input-${entry.id}`}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void onPick(e.target.files);
        }}
      />
      {problem ? (
        <p className="callout" role="status" data-testid={`receipt-problem-${entry.id}`}>
          {receiptFailureMessage(problem)}
        </p>
      ) : null}
      {nearLimit ? (
        <p className="callout" role="status" data-testid={`receipt-quota-${entry.id}`}>
          This browser&rsquo;s storage for this site is more than 80% full. Removing a few receipts
          now avoids a failed save later.
        </p>
      ) : null}
    </div>
  );
}
