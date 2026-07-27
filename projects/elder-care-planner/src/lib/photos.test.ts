import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  MAX_EDGE_PX,
  JPEG_QUALITY,
  MAX_PHOTOS_PER_FACILITY,
  MAX_PHOTOS_TOTAL,
  QUOTA_WARN_FRACTION,
  scaledSize,
  capCheck,
  photosAvailable,
  photoFailureMessage,
  estimateUsage,
  storePhoto,
  loadPhoto,
  type PhotoFailure,
} from './photos';

// Backfilled coverage (.agents/AGENTS.md §5): no Red step; every case was proved
// by mutation — see the PR body.
//
// This is the module from the §6 lesson "A Binary Attachment Must Not Share a
// Storage Budget With the Record It Annotates". The downscaling caps and the
// per-plan limits are what make its ~5MB budget generous rather than
// theoretical, and every failure has to come back as a *reason* rather than a
// throw, because the plan write must survive a photo write that did not.
//
// Scope note: this app's Vitest environment is `node`, so there is no
// IndexedDB, no canvas and no `navigator.storage` here. That makes the
// unsupported path directly testable and the happy IndexedDB path not — the
// latter is covered by e2e/facilities.spec.ts, which measures the real
// localStorage payload before and after attaching. The pure helpers below are
// where the arithmetic that protects the quota actually lives.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scaledSize', () => {
  it('Given an image already within the maximum edge, When it is scaled, Then its dimensions are unchanged', () => {
    // Upscaling a small photo would inflate the stored bytes for no gain.
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(MAX_EDGE_PX, 900)).toEqual({ width: MAX_EDGE_PX, height: 900 });
  });

  it('Given a landscape photo over the maximum edge, When it is scaled, Then the long edge is capped and the ratio is preserved', () => {
    // A 4000x3000 phone photo is the case the cap exists for.
    expect(scaledSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  it('Given a portrait photo over the maximum edge, When it is scaled, Then the long edge is the height', () => {
    // Scaling on width alone would leave a portrait photo far over budget.
    expect(scaledSize(3000, 4000)).toEqual({ width: 960, height: 1280 });
  });

  it('Given a square photo over the maximum edge, When it is scaled, Then both edges land on the cap', () => {
    expect(scaledSize(2000, 2000)).toEqual({ width: 1280, height: 1280 });
  });

  it('Given an explicit maximum edge, When an image is scaled, Then the caller’s cap is honoured rather than the default', () => {
    expect(scaledSize(4000, 2000, 400)).toEqual({ width: 400, height: 200 });
  });

  it('Given an extremely elongated image, When it is scaled, Then the short edge never rounds down to zero', () => {
    // A zero-width canvas throws, so a degenerate panorama would turn a valid
    // (if odd) photo into a hard failure rather than a small one.
    //
    // The ratio has to be extreme enough that plain rounding actually reaches
    // zero: 4000x3 scales to 0.96 and rounds up to 1 on its own, so an earlier
    // version of this case survived removing the Math.max(1, ...) floor. At
    // 4000x1 the floor is the only thing between this and a thrown canvas.
    for (const [w, h] of [[4000, 1], [8000, 3], [1, 4000]]) {
      const scaled = scaledSize(w, h);
      expect(scaled.width, `width collapsed for ${w}x${h}`).toBeGreaterThanOrEqual(1);
      expect(scaled.height, `height collapsed for ${w}x${h}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('Given a zero-sized image, When it is scaled, Then it is returned unchanged rather than dividing by zero', () => {
    expect(scaledSize(0, 0)).toEqual({ width: 0, height: 0 });
  });

  it('Given any oversized image, When it is scaled, Then the result never exceeds the cap on either edge', () => {
    for (const [w, h] of [[4000, 3000], [3000, 4000], [1281, 1], [9000, 5000], [1, 4000]]) {
      const scaled = scaledSize(w, h);
      expect(Math.max(scaled.width, scaled.height)).toBeLessThanOrEqual(MAX_EDGE_PX);
    }
  });

  it('Given the storage settings, When they are read, Then the cap and quality keep a photo well inside the budget', () => {
    // The lesson's actual claim: a phone photo base64-encodes to 4-5MB, which
    // is the whole origin budget. 1280px at q0.7 is what makes that safe.
    expect(MAX_EDGE_PX).toBeLessThanOrEqual(1280);
    expect(JPEG_QUALITY).toBeGreaterThan(0);
    expect(JPEG_QUALITY).toBeLessThanOrEqual(0.8);
  });
});

describe('capCheck', () => {
  it('Given room under both limits, When another photo is attempted, Then it is allowed', () => {
    expect(capCheck(0, 0)).toEqual({ ok: true, value: true });
    expect(capCheck(MAX_PHOTOS_PER_FACILITY - 1, MAX_PHOTOS_TOTAL - 1))
      .toEqual({ ok: true, value: true });
  });

  it('Given a facility already at its own limit, When another photo is attempted, Then it is refused as a cap', () => {
    expect(capCheck(MAX_PHOTOS_PER_FACILITY, 0)).toEqual({ ok: false, reason: 'cap' });
  });

  it('Given the plan already at the overall limit, When another photo is attempted, Then it is refused as a cap', () => {
    // The per-facility check passing is not enough: six facilities each under
    // their own limit can still exhaust the plan-wide budget.
    expect(capCheck(0, MAX_PHOTOS_TOTAL)).toEqual({ ok: false, reason: 'cap' });
  });

  it('Given counts beyond either limit, When another photo is attempted, Then it is still refused rather than wrapping around', () => {
    expect(capCheck(MAX_PHOTOS_PER_FACILITY + 5, 0).ok).toBe(false);
    expect(capCheck(0, MAX_PHOTOS_TOTAL + 5).ok).toBe(false);
  });

  it('Given the two limits, When they are compared, Then the per-facility cap is the tighter of the two', () => {
    // A per-facility cap at or above the total would make it dead code.
    expect(MAX_PHOTOS_PER_FACILITY).toBeLessThan(MAX_PHOTOS_TOTAL);
  });
});

describe('photosAvailable and the unsupported path', () => {
  it('Given a runtime with no IndexedDB, When availability is checked, Then it reports unavailable rather than throwing', () => {
    // This is the server-render and privacy-mode case; it must degrade, because
    // the rest of the plan works perfectly well without photos.
    expect(photosAvailable()).toBe(false);
  });

  it('Given a runtime with no IndexedDB, When a photo is stored, Then it fails with the unsupported reason', async () => {
    const result = await storePhoto(new Blob(['x']), 'facility-1');
    expect(result).toEqual({ ok: false, reason: 'unsupported' });
  });

  it('Given a runtime with no IndexedDB, When a photo is loaded, Then null is returned rather than throwing', async () => {
    await expect(loadPhoto('facility-1')).resolves.toBeNull();
  });
});

describe('estimateUsage', () => {
  it('Given a runtime with no storage estimate API, When usage is estimated, Then null is returned rather than throwing', async () => {
    // Note for anyone mutation-testing this module: deleting the early
    // `typeof navigator === 'undefined' || !navigator.storage?.estimate` guard
    // does NOT fail this case, and that is correct rather than a hole. Without
    // the guard the call throws and the surrounding catch returns null by the
    // other route, so the two paths are observably identical. The guard is
    // defensive, not load-bearing; the behaviour asserted here is the contract.
    await expect(estimateUsage()).resolves.toBeNull();
  });

  it('Given a browser reporting usage below the warning fraction, When usage is estimated, Then it is not flagged as near the limit', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: async () => ({ usage: 1_000, quota: 10_000 }) } });
    const usage = await estimateUsage();
    expect(usage).toEqual({ usedBytes: 1_000, quotaBytes: 10_000, fraction: 0.1, nearLimit: false });
  });

  it('Given a browser reporting usage at the warning fraction, When usage is estimated, Then it is flagged as near the limit', async () => {
    // Warning early is the point: the family should hear about it before the
    // write that fails, not after.
    vi.stubGlobal('navigator', {
      storage: { estimate: async () => ({ usage: QUOTA_WARN_FRACTION * 10_000, quota: 10_000 }) },
    });
    expect((await estimateUsage())?.nearLimit).toBe(true);
  });

  it('Given a browser reporting a zero quota, When usage is estimated, Then the fraction is zero rather than NaN', async () => {
    // usage/0 is NaN, and NaN >= 0.8 is false, so the bug would hide as a
    // warning that simply never appears.
    vi.stubGlobal('navigator', { storage: { estimate: async () => ({ usage: 500, quota: 0 }) } });
    const usage = await estimateUsage();
    expect(usage?.fraction).toBe(0);
    expect(usage?.nearLimit).toBe(false);
  });

  it('Given a browser whose estimate rejects, When usage is estimated, Then null is returned rather than throwing', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: async () => { throw new Error('denied'); } } });
    await expect(estimateUsage()).resolves.toBeNull();
  });
});

describe('photoFailureMessage', () => {
  const REASONS: PhotoFailure[] = ['unsupported', 'quota', 'decode', 'cap', 'failed'];

  it.each(REASONS)('Given the %s failure, When its message is built, Then it is non-empty plain language', (reason) => {
    const message = photoFailureMessage(reason);
    expect(message.length).toBeGreaterThan(20);
    // No raw reason codes or error-speak leaking into family-facing copy.
    expect(message).not.toContain(reason === 'failed' ? '__never__' : reason);
  });

  it('Given every failure reason, When messages are collected, Then each reads differently', () => {
    // A shared fallback message would tell a family "something went wrong" when
    // the app knows exactly what did and what they can do about it.
    const messages = REASONS.map(photoFailureMessage);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('Given the cap failure, When its message is built, Then it states both limits and the way out', () => {
    const message = photoFailureMessage('cap');
    expect(message).toContain(String(MAX_PHOTOS_PER_FACILITY));
    expect(message).toContain(String(MAX_PHOTOS_TOTAL));
    expect(message.toLowerCase()).toContain('removing');
  });

  it.each<PhotoFailure>(['quota', 'failed'])(
    'Given the %s failure, When its message is built, Then it reassures that the plan itself was saved',
    (reason) => {
      // The §6 lesson's core promise: a failed photo write must not read as
      // though the ledger went with it.
      expect(photoFailureMessage(reason).toLowerCase()).toContain('plan itself is unaffected');
    });
});
