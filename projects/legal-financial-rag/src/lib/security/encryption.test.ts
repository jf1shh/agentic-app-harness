import { describe, it, expect } from 'vitest';
import {
  calculateSHA256,
  encryptText,
  decryptText,
  generateMasterKey,
  deriveKeyFromPassphrase,
} from './encryption';

// src/lib/unit.test.ts already proves the round trip (encrypt then decrypt
// with the *same* key recovers the plaintext). What it never proves is the
// half of AES-GCM that actually matters for a "vault": that a wrong key, a
// wrong passphrase, or a single tampered byte of ciphertext is rejected
// rather than silently decrypting to garbage or succeeding. All of this
// already works — AES-GCM's authentication tag guarantees it — so this is
// backfilled coverage (.agents/AGENTS.md §5.4), proved by mutation: see the
// PR body for the mutation applied to decryptText (swallow the WebCrypto
// rejection and return an empty string) and the assertions it broke.

describe('encryption', () => {
  describe('decryption failure modes', () => {
    it('Given ciphertext encrypted under one key, When decrypted with a different key, Then decryption is rejected', async () => {
      const keyA = await generateMasterKey();
      const keyB = await generateMasterKey();
      const { cipherTextHex, ivHex } = await encryptText('Confidential merger terms', keyA);

      await expect(decryptText(cipherTextHex, ivHex, keyB)).rejects.toThrow();
    });

    it('Given ciphertext with one hex character tampered, When decrypted with the correct key, Then decryption is rejected', async () => {
      const key = await generateMasterKey();
      const { cipherTextHex, ivHex } = await encryptText('Attorney-client privileged memo', key);

      const tamperedChar = cipherTextHex[0] === 'a' ? 'b' : 'a';
      const tamperedCipherTextHex = tamperedChar + cipherTextHex.slice(1);

      await expect(decryptText(tamperedCipherTextHex, ivHex, key)).rejects.toThrow();
    });

    it('Given a key derived from the wrong passphrase but the correct salt, When decrypting, Then decryption is rejected', async () => {
      const { key: rightKey, saltHex } = await deriveKeyFromPassphrase('CorrectHorseBatteryStaple2026!');
      const { key: wrongKey } = await deriveKeyFromPassphrase('AnIncorrectGuess!', saltHex);

      const { cipherTextHex, ivHex } = await encryptText('Loan covenant terms', rightKey);

      await expect(decryptText(cipherTextHex, ivHex, wrongKey)).rejects.toThrow();
    });
  });

  describe('key derivation', () => {
    it('Given a salt hex string, When it round-trips through deriveKeyFromPassphrase, Then the exact same salt bytes are reproduced', async () => {
      const { saltHex: originalSalt } = await deriveKeyFromPassphrase('SomePassphrase!');
      const { saltHex: roundTripped } = await deriveKeyFromPassphrase('AnotherPassphrase!', originalSalt);

      expect(roundTripped).toBe(originalSalt);
    });
  });

  describe('hashing', () => {
    it('Given two different inputs, When each is hashed, Then SHA-256 returns different digests', async () => {
      const hashA = await calculateSHA256('Consolidated Total Leverage Ratio');
      const hashB = await calculateSHA256('Consolidated Total Leverage Ration');

      expect(hashA).not.toBe(hashB);
    });
  });
});
