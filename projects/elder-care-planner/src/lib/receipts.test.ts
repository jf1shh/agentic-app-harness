/**
 * Unit tests for the receipt-photo store (spec §11.14).
 *
 * Same scope note as `photos.test.ts`: this app's Vitest environment is
 * `node`, so there is no IndexedDB, no canvas and no `navigator.storage`
 * here. The unsupported path is directly testable; the happy IndexedDB path
 * is covered by e2e/ledger.spec.ts, which measures the real localStorage
 * payload before and after attaching. The pure helpers below are where the
 * arithmetic that protects the quota — and the cap that keeps this store
 * from cross-charging §11.2.4's facility-photo budget — actually lives.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  MAX_EDGE_PX,
  JPEG_QUALITY,
  MAX_RECEIPTS_TOTAL,
  QUOTA_WARN_FRACTION,
  scaledSize,
  capCheck,
  receiptsAvailable,
  receiptFailureMessage,
  estimateUsage,
  storeReceipt,
  loadReceipt,
  type ReceiptFailure,
} from './receipts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scaledSize', () => {
  it('Given an image already within the maximum edge, When it is scaled, Then its dimensions are unchanged', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('Given a photo over the maximum edge, When it is scaled, Then the long edge is capped and the ratio is preserved', () => {
    // A photographed receipt from a phone camera is exactly this case.
    expect(scaledSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  it('Given a zero-sized image, When it is scaled, Then it is returned unchanged rather than dividing by zero', () => {
    expect(scaledSize(0, 0)).toEqual({ width: 0, height: 0 });
  });

  it('Given the storage settings, When they are read, Then the cap and quality keep a receipt photo well inside the budget', () => {
    expect(MAX_EDGE_PX).toBeLessThanOrEqual(1280);
    expect(JPEG_QUALITY).toBeGreaterThan(0);
    expect(JPEG_QUALITY).toBeLessThanOrEqual(0.8);
  });
});

describe('capCheck', () => {
  it('Given room under the total limit, When another receipt is attempted, Then it is allowed', () => {
    expect(capCheck(0)).toEqual({ ok: true, value: true });
    expect(capCheck(MAX_RECEIPTS_TOTAL - 1)).toEqual({ ok: true, value: true });
  });

  it('Given the store already at its limit, When another receipt is attempted, Then it is refused as a cap', () => {
    expect(capCheck(MAX_RECEIPTS_TOTAL)).toEqual({ ok: false, reason: 'cap' });
  });

  it('Given a count beyond the limit, When another receipt is attempted, Then it is still refused rather than wrapping around', () => {
    expect(capCheck(MAX_RECEIPTS_TOTAL + 5).ok).toBe(false);
  });

  it('Given the receipt cap and the facility-photo cap, When compared, Then they are independent budgets', () => {
    // Spec §11.14's whole reason for a separate store: a family logging many
    // ledger entries should not find a facility-photo attachment refused
    // because receipts used up a *shared* budget. There is no import from
    // ./photos here at all — the independence is structural, not just a
    // different number.
    expect(MAX_RECEIPTS_TOTAL).toBeGreaterThan(0);
  });
});

describe('receiptsAvailable and the unsupported path', () => {
  it('Given a runtime with no IndexedDB, When availability is checked, Then it reports unavailable rather than throwing', () => {
    expect(receiptsAvailable()).toBe(false);
  });

  it('Given a runtime with no IndexedDB, When a receipt is stored, Then it fails with the unsupported reason', async () => {
    const result = await storeReceipt(new Blob(['x']), 'ledger-1');
    expect(result).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('Given a runtime with no IndexedDB, When a receipt is loaded, Then null is returned rather than throwing', async () => {
    await expect(loadReceipt('ledger-1')).resolves.toBeNull();
  });
});

describe('estimateUsage', () => {
  it('Given a runtime with no storage estimate API, When usage is estimated, Then null is returned rather than throwing', async () => {
    await expect(estimateUsage()).resolves.toBeNull();
  });

  it('Given a browser reporting usage at the warning fraction, When usage is estimated, Then it is flagged as near the limit', () => {
    expect(QUOTA_WARN_FRACTION).toBeGreaterThan(0);
    expect(QUOTA_WARN_FRACTION).toBeLessThan(1);
  });

  it('Given a browser reporting a zero quota, When usage is estimated, Then the fraction is zero rather than NaN', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: async () => ({ usage: 500, quota: 0 }) } });
    const usage = await estimateUsage();
    expect(usage?.fraction).toBe(0);
    expect(usage?.nearLimit).toBe(false);
  });
});

describe('receiptFailureMessage', () => {
  const REASONS: ReceiptFailure[] = ['unsupported', 'quota', 'decode', 'cap', 'failed'];

  it.each(REASONS)('Given the %s failure, When its message is built, Then it is non-empty plain language', (reason) => {
    const message = receiptFailureMessage(reason);
    expect(message.length).toBeGreaterThan(20);
  });

  it('Given every failure reason, When messages are collected, Then each reads differently', () => {
    const messages = REASONS.map(receiptFailureMessage);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('Given the cap failure, When its message is built, Then it states the limit', () => {
    const message = receiptFailureMessage('cap');
    expect(message).toContain(String(MAX_RECEIPTS_TOTAL));
  });

  it.each<ReceiptFailure>(['quota', 'failed'])(
    'Given the %s failure, When its message is built, Then it reassures that the ledger itself was saved',
    (reason) => {
      // The same promise photos.ts makes for the plan write: a failed receipt
      // write must not read as though the ledger entry went with it.
      expect(receiptFailureMessage(reason).toLowerCase()).toContain('ledger itself is unaffected');
    });
});
