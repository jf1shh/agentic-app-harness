/**
 * Unit tests for the shared-plan link (spec §11.6).
 *
 * The contract that matters: the plan is serialised, compressed, and
 * encrypted with a passphrase, and it round-trips exactly for whoever holds
 * that passphrase. Anyone else — wrong passphrase, tampered fragment,
 * malformed input — must get a clean failure, never a decrypted-but-wrong
 * payload and never a thrown exception.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  encodePlanForShare,
  decodePlanFromShare,
  extractShareFragment,
  buildShareUrl,
  bytesToBase64Url,
  base64UrlToBytes,
  SHARE_FRAGMENT_PREFIX,
} from './share';
import { DEFAULT_ASSUMPTIONS, type Plan } from './schemas';

const PLAN: Plan = {
  schemaVersion: 1,
  careRecipientLabel: 'Mom',
  scenarios: [
    {
      id: 's1',
      label: 'Assisted living',
      careType: 'assisted_living',
      stateCode: 'TX',
      ancillary: [],
    },
  ],
  activeScenarioId: 's1',
  income: [],
  assets: [],
  contributors: [],
  ledger: [],
  caregiverImpacts: [],
  assumptions: DEFAULT_ASSUMPTIONS,
  updatedAt: '2026-07-26T00:00:00.000Z',
};

describe('Given a plan and a passphrase', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('When encoded and decoded with the same passphrase, Then the exact plan comes back', async () => {
    const fragment = await encodePlanForShare(PLAN, 'correct horse battery staple', 'Dana');
    const result = await decodePlanFromShare(fragment, 'correct horse battery staple');

    expect(result.ok).toBe(true);
    expect(result.ok && result.payload.plan).toEqual(PLAN);
    expect(result.ok && result.payload.createdBy).toBe('Dana');
    expect(result.ok && result.payload.schemaVersion).toBe(1);
  });

  it('When encoded twice, Then the two links differ (a fresh salt and IV each time)', async () => {
    // The clock is frozen so createdAt cannot be the reason the two fragments
    // differ — with identical plaintext, the salt and IV are the only thing
    // left that can make the ciphertext different.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T00:00:00.000Z'));

    const first = await encodePlanForShare(PLAN, 'correct horse battery staple');
    const second = await encodePlanForShare(PLAN, 'correct horse battery staple');

    expect(first).not.toBe(second);
  });

  it('When decoded with the wrong passphrase, Then it fails cleanly rather than returning garbage', async () => {
    const fragment = await encodePlanForShare(PLAN, 'correct horse battery staple');
    const result = await decodePlanFromShare(fragment, 'wrong passphrase');

    expect(result.ok).toBe(false);
  });

  it('When the fragment has been tampered with, Then it fails rather than decrypting to a corrupted plan', async () => {
    const fragment = await encodePlanForShare(PLAN, 'correct horse battery staple');
    const segments = fragment.slice(SHARE_FRAGMENT_PREFIX.length).split('.');

    // Flip one bit in a byte near the middle of the ciphertext. Editing the
    // base64url text directly is unreliable here: the last character of a
    // base64 group can carry padding bits that never map to a real byte, so
    // editing it sometimes decodes to the exact same bytes. Decoding to bytes
    // first and flipping one guarantees an actual content change.
    const cipherBytes = base64UrlToBytes(segments[2]);
    const middle = Math.floor(cipherBytes.length / 2);
    cipherBytes[middle] ^= 0xff;
    const tamperedCipher = bytesToBase64Url(cipherBytes);

    const tampered =
      SHARE_FRAGMENT_PREFIX + [segments[0], segments[1], tamperedCipher].join('.');

    const result = await decodePlanFromShare(tampered, 'correct horse battery staple');
    expect(result.ok).toBe(false);
  });
});

describe('Given malformed input to the decoder', () => {
  it('When the fragment carries the wrong prefix, Then it fails without throwing', async () => {
    const result = await decodePlanFromShare('not-a-share-fragment', 'anything');
    expect(result.ok).toBe(false);
  });

  it('When the fragment is missing a segment, Then it fails without throwing', async () => {
    const result = await decodePlanFromShare(`${SHARE_FRAGMENT_PREFIX}onlyonepart`, 'anything');
    expect(result.ok).toBe(false);
  });

  it('When a segment is not valid base64url, Then it fails without throwing', async () => {
    const result = await decodePlanFromShare(
      `${SHARE_FRAGMENT_PREFIX}not-valid!.not-valid!.not-valid!`,
      'anything',
    );
    expect(result.ok).toBe(false);
  });
});

describe('Given the URL hash a recipient actually opens', () => {
  it('When it carries a share fragment, Then extractShareFragment reads it out', () => {
    const hash = `#${SHARE_FRAGMENT_PREFIX}abc.def.ghi`;
    expect(extractShareFragment(hash)).toBe(`${SHARE_FRAGMENT_PREFIX}abc.def.ghi`);
  });

  it('When the hash is empty, Then extractShareFragment reports nothing to open', () => {
    expect(extractShareFragment('')).toBeNull();
    expect(extractShareFragment('#')).toBeNull();
  });

  it('When the hash is an unrelated fragment, Then extractShareFragment reports nothing to open', () => {
    expect(extractShareFragment('#some-other-anchor')).toBeNull();
  });
});

describe('Given a fragment ready to hand to a sibling', () => {
  it('When built into a URL, Then the fragment is never sent as a query param or path segment', () => {
    const fragment = `${SHARE_FRAGMENT_PREFIX}abc.def.ghi`;
    const url = buildShareUrl(fragment);

    expect(url).toContain(`#${fragment}`);
    expect(url.split('#')[0]).not.toContain(fragment);
  });
});

describe('Given the shared-plan payload never carries facility photos', () => {
  it('When a plan is encoded, Then the decoded payload has no facilities or photoIds field', async () => {
    // Plan structurally excludes them (spec §11.6: "§11.2 photos are excluded
    // from the link on the same grounds as export") — this asserts that stays
    // true rather than trusting it silently.
    const fragment = await encodePlanForShare(PLAN, 'correct horse battery staple');
    const result = await decodePlanFromShare(fragment, 'correct horse battery staple');

    expect(result.ok).toBe(true);
    expect(result.ok && 'facilities' in result.payload.plan).toBe(false);
    expect(result.ok && 'photoIds' in result.payload.plan).toBe(false);
  });
});
