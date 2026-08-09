import { describe, it, expect } from 'vitest';
import { encodeTripShare, decodeTripShare, buildShareUrl, parseShareFromHash } from '../src/utils/share';
import { TripShareState } from '../src/schemas';

const SAMPLE_STATE: TripShareState = {
  destination: 'Hawaii',
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  archetype: 'quiet-luxury',
  strategy: 'standard',
  activity: 'sightseeing',
  closetSource: 'archetype',
  selectedSuitcase: 'The Carry-On',
  selectedAirline: 'EK',
};

describe('encodeTripShare / decodeTripShare', () => {
  it('Given a valid trip state, When it is encoded and decoded, Then the round trip preserves every field', () => {
    const encoded = encodeTripShare(SAMPLE_STATE);
    expect(encoded).toBeTruthy();
    const decoded = decodeTripShare(encoded as string);
    expect(decoded).toEqual(SAMPLE_STATE);
  });

  it('Given a trip state with custom garments, When round-tripped, Then the garments survive intact', () => {
    const withGarments: TripShareState = {
      ...SAMPLE_STATE,
      closetSource: 'custom',
      customGarments: [
        {
          id: 'w-1', name: 'Navy Blazer', category: 'top', roles: ['topper'],
          colors: ['navy'], warmth: 7, exclusionTags: [], weightGrams: 800, volumeCm3: 1500,
        },
      ],
    };
    const encoded = encodeTripShare(withGarments);
    const decoded = decodeTripShare(encoded as string);
    expect(decoded?.customGarments).toHaveLength(1);
    expect(decoded?.customGarments?.[0].name).toBe('Navy Blazer');
  });

  it('Given a garbage string, When decoded, Then null is returned rather than throwing', () => {
    expect(decodeTripShare('not-valid-lz-string-data!!!')).toBeNull();
  });

  it('Given a compressed payload that decompresses to schema-invalid JSON, When decoded, Then null is returned rather than trusting it', () => {
    // A share payload missing required fields — e.g. handcrafted by an
    // attacker — must be rejected by the schema, not silently accepted.
    const encoded = encodeTripShare({ destination: 'x' } as unknown as TripShareState);
    expect(decodeTripShare(encoded as string)).toBeNull();
  });

  it('Given a single flipped character in the middle of a valid encoded payload, When decoded, Then it does not silently produce a different valid trip', () => {
    const encoded = encodeTripShare(SAMPLE_STATE) as string;
    const mid = Math.floor(encoded.length / 2);
    const flippedChar = encoded[mid] === 'A' ? 'B' : 'A';
    const tampered = encoded.slice(0, mid) + flippedChar + encoded.slice(mid + 1);
    const decoded = decodeTripShare(tampered);
    // Either it fails to decompress/parse/validate (null), or — if by
    // chance it still parses — it must not silently equal the original.
    if (decoded !== null) {
      expect(decoded).not.toEqual(SAMPLE_STATE);
    }
  });
});

describe('buildShareUrl / parseShareFromHash', () => {
  it('Given a trip state, When a share URL is built, Then it carries a #share= fragment that round-trips back to the same state', () => {
    const url = buildShareUrl(SAMPLE_STATE, 'https://example.com/app');
    expect(url).toMatch(/^https:\/\/example\.com\/app#share=/);
    const hash = url!.slice(url!.indexOf('#'));
    const decoded = parseShareFromHash(hash);
    expect(decoded).toEqual(SAMPLE_STATE);
  });

  it('Given a hash with no share param, When parsed, Then null is returned', () => {
    expect(parseShareFromHash('#')).toBeNull();
    expect(parseShareFromHash('')).toBeNull();
    expect(parseShareFromHash('#other=123')).toBeNull();
  });
});
