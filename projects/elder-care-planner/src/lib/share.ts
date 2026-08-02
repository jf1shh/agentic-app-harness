/**
 * Shared family link (spec §11.6).
 *
 * The plan is serialised, gzip-compressed, and encrypted with AES-GCM under a
 * key derived (PBKDF2) from a passphrase the sender shares out of band —
 * never in the same message as the link. The result lives entirely in the URL
 * **fragment**: fragments are never sent in an HTTP request, so the payload
 * reaches a sibling without ever reaching a server (spec §1.2).
 *
 * This is a snapshot, not sync. There is deliberately no way to merge a
 * decoded plan back into anyone's edits — two siblings opening the same link
 * and each continuing to edit their own copy produce two plans, and the UI
 * that calls this module must say that plainly rather than implying
 * convergence it cannot deliver.
 *
 * `globalThis.crypto` / `CompressionStream`, not `window.*`: this module runs
 * both in the browser and under Vitest's `environment: 'node'` (see
 * vitest.config.ts), and `window` does not exist in the latter.
 */
import { SharedPlanPayloadSchema, type Plan, type SharedPlanPayload } from './schemas';

export const SHARE_FRAGMENT_PREFIX = 'share=v1.';

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

type DecodeResult = { ok: true; payload: SharedPlanPayload } | { ok: false };

/** Exported for tests that need to tamper with an encoded fragment at the byte level. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Exported for tests that need to tamper with an encoded fragment at the byte level. */
export function base64UrlToBytes(b64url: string): Uint8Array {
  if (!/^[A-Za-z0-9\-_]+$/.test(b64url)) throw new Error('not valid base64url');
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64url.length + ((4 - (b64url.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  // A fresh Uint8Array, not the source's .buffer: passing a view whose buffer
  // is larger than the view itself fails Node's WebCrypto binding (.agents/AGENTS.md
  // §6 "Node WebCrypto TypedArray Buffer Normalization").
  const saltBuffer = new Uint8Array(salt) as unknown as BufferSource;
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function compress(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Encode a plan into a share fragment (without its leading `#`).
 *
 * `createdBy` is a label, not an identity check — anyone who can produce a
 * valid fragment can put any name in it. It exists so the recipient's screen
 * can say who made the snapshot and when, per spec §11.6.
 */
export async function encodePlanForShare(
  plan: Plan,
  passphrase: string,
  createdBy?: string,
): Promise<string> {
  const payload: SharedPlanPayload = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    createdBy,
    plan,
  };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await compress(json);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    compressed as unknown as BufferSource,
  );

  const segments = [
    bytesToBase64Url(salt),
    bytesToBase64Url(iv),
    bytesToBase64Url(new Uint8Array(cipherBuffer)),
  ];
  return `${SHARE_FRAGMENT_PREFIX}${segments.join('.')}`;
}

/**
 * Decode a share fragment. Every failure mode — wrong passphrase, tampered
 * ciphertext, malformed input — collapses to the same `{ ok: false }`, on
 * purpose: distinguishing "wrong passphrase" from "corrupted link" would leak
 * information an attacker could use, and AES-GCM's authentication tag cannot
 * tell them apart in the first place.
 */
export async function decodePlanFromShare(
  fragment: string,
  passphrase: string,
): Promise<DecodeResult> {
  try {
    if (!fragment.startsWith(SHARE_FRAGMENT_PREFIX)) return { ok: false };
    const segments = fragment.slice(SHARE_FRAGMENT_PREFIX.length).split('.');
    if (segments.length !== 3 || segments.some((s) => s.length === 0)) return { ok: false };
    const [saltB64, ivB64, cipherB64] = segments;

    const salt = base64UrlToBytes(saltB64);
    const iv = base64UrlToBytes(ivB64);
    const cipherBytes = base64UrlToBytes(cipherB64);

    const key = await deriveKey(passphrase, salt);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource,
    );
    const decompressed = await decompress(new Uint8Array(plainBuffer));
    const json = new TextDecoder().decode(decompressed);
    const parsed = SharedPlanPayloadSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return { ok: false };
    return { ok: true, payload: parsed.data };
  } catch {
    // Wrong passphrase (AES-GCM auth failure), a hand-edited link, or bytes
    // that never came from this app — all the same clean failure to the caller.
    return { ok: false };
  }
}

/** Reads a share fragment out of `location.hash`, or null if there isn't one. */
export function extractShareFragment(hash: string): string | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  return trimmed.startsWith(SHARE_FRAGMENT_PREFIX) ? trimmed : null;
}

/** The full URL a sender copies and sends — same page, fragment appended. */
export function buildShareUrl(fragment: string): string {
  if (typeof window === 'undefined') return `#${fragment}`;
  return `${window.location.origin}${window.location.pathname}#${fragment}`;
}
