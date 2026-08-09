import LZString from 'lz-string';
import { TripShareSchema, TripShareState } from '../schemas';

const SHARE_HASH_PREFIX = '#share=';

/** Compress a trip's inputs into a URL-safe string for sharing. */
export function encodeTripShare(state: TripShareState): string | null {
  try {
    const payload = JSON.stringify(state);
    return LZString.compressToEncodedURIComponent(payload);
  } catch {
    return null;
  }
}

/**
 * Decompress and validate a share payload. Share links are attacker-
 * controllable input, so a decompressed payload that fails the
 * TripShareSchema contract is rejected rather than trusted.
 */
export function decodeTripShare(encoded: string): TripShareState | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    const result = TripShareSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Build a full shareable URL carrying the trip state in its fragment. */
export function buildShareUrl(state: TripShareState, baseUrl: string): string | null {
  const encoded = encodeTripShare(state);
  if (!encoded) return null;
  const base = baseUrl.split('#')[0];
  return `${base}${SHARE_HASH_PREFIX}${encoded}`;
}

/** Extract and decode a trip share payload from a URL fragment, if present. */
export function parseShareFromHash(hash: string): TripShareState | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  const encoded = hash.slice(SHARE_HASH_PREFIX.length);
  if (!encoded) return null;
  return decodeTripShare(encoded);
}
