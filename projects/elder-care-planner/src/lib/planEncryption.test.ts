import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptWithKey,
  decryptWithKey,
  deviceKeyAvailable,
  getOrCreateDeviceKey,
  resetDeviceKeyCache,
  ENCRYPTED_PREFIX,
} from './planEncryption';

// Encryption at rest for the persisted planner state (spec §4.1a,
// .agents/AGENTS.md §11). The device-key/IndexedDB half is browser-only and
// degrades to null under Vitest's `environment: 'node'` (vitest.config.ts) —
// same shape as photos.test.ts's "unsupported" coverage. The encrypt/decrypt
// primitives themselves run on Node's WebCrypto directly, so they get real
// round-trip and tamper-detection coverage here, against a key generated in
// the test rather than one retrieved through IndexedDB.

async function generateTestKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

describe('encryptWithKey and decryptWithKey', () => {
  it('Given a plaintext string, When it is encrypted and decrypted under the same key, Then it round-trips unchanged', async () => {
    const key = await generateTestKey();
    const envelope = await encryptWithKey(key, 'a family\'s real numbers');
    expect(await decryptWithKey(key, envelope)).toBe('a family\'s real numbers');
  });

  it('Given the same plaintext encrypted twice, When the envelopes are compared, Then they differ (a fresh random IV each time)', async () => {
    const key = await generateTestKey();
    const first = await encryptWithKey(key, 'monthlyIncomeCents:312500');
    const second = await encryptWithKey(key, 'monthlyIncomeCents:312500');
    expect(first).not.toBe(second);
  });

  it('Given an encrypted envelope, When it is inspected, Then it carries the versioned prefix and never the plaintext', async () => {
    const key = await generateTestKey();
    const envelope = await encryptWithKey(key, 'monthlyIncomeCents:312500');
    expect(envelope.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    expect(envelope).not.toContain('312500');
  });

  it('Given an envelope decrypted under the wrong key, When decryption is attempted, Then it fails cleanly rather than returning garbage', async () => {
    const key = await generateTestKey();
    const wrongKey = await generateTestKey();
    const envelope = await encryptWithKey(key, 'a secret figure');
    expect(await decryptWithKey(wrongKey, envelope)).toBeNull();
  });

  it('Given a ciphertext byte flipped in the middle, When decryption is attempted, Then AES-GCM authentication rejects it', async () => {
    // Tamper at the byte level, not the string level: flipping the last
    // base64url character can land on a padding-only bit and re-encode to
    // the *same* bytes, which would make this test pass for the wrong
    // reason (.agents/AGENTS.md §6, "A Tamper Test on Base64(url) Text Can
    // Silently Tamper Nothing").
    const key = await generateTestKey();
    const envelope = await encryptWithKey(key, 'a much longer figure to tamper safely in the middle of');
    const [, ivB64, cipherB64] = envelope.split('.');
    const cipherBytes = Uint8Array.from(
      atob(cipherB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    cipherBytes[Math.floor(cipherBytes.length / 2)] ^= 0xff;
    const tamperedB64 = btoa(String.fromCharCode(...cipherBytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const tampered = `${ENCRYPTED_PREFIX}${ivB64}.${tamperedB64}`;
    expect(await decryptWithKey(key, tampered)).toBeNull();
  });

  it('Given a malformed envelope, When decryption is attempted, Then it fails cleanly rather than throwing', async () => {
    const key = await generateTestKey();
    expect(await decryptWithKey(key, 'not an envelope at all')).toBeNull();
    expect(await decryptWithKey(key, `${ENCRYPTED_PREFIX}only-one-segment`)).toBeNull();
    expect(await decryptWithKey(key, `${ENCRYPTED_PREFIX}.empty-iv-segment`)).toBeNull();
  });
});

describe('deviceKeyAvailable and getOrCreateDeviceKey, when IndexedDB is unsupported', () => {
  beforeEach(() => resetDeviceKeyCache());

  it('Given a runtime with no IndexedDB (this Node test process), When availability is checked, Then it reports unavailable', () => {
    expect(deviceKeyAvailable()).toBe(false);
  });

  it('Given a runtime with no IndexedDB, When the device key is requested, Then null is returned rather than throwing', async () => {
    expect(await getOrCreateDeviceKey()).toBeNull();
  });
});
