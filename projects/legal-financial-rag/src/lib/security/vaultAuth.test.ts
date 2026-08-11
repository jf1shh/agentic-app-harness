import { describe, it, expect } from 'vitest';
import { registerVaultPassphrase, verifyVaultPassphrase } from './vaultAuth';
import { deriveKeyFromPassphrase, exportKeyToHex } from './encryption';

// The vault lock screen claims to gate access behind a PBKDF2-derived key, but
// VaultLockModal previously called deriveKeyFromPassphrase and accepted
// whatever key came back — there was no stored verifier to check the
// passphrase against, so any string unlocked the vault. These functions give
// the app something to check against: a salt + verifier hash recorded the
// first time a passphrase is set, and a matching re-derivation on every
// unlock attempt after that.
describe('vaultAuth', () => {
  it('Given a passphrase, When registered, Then a salt and verifier are produced', async () => {
    const record = await registerVaultPassphrase('CorrectHorseBatteryStaple2026!');

    expect(record.saltHex.length).toBeGreaterThan(0);
    expect(record.verifierHex.length).toBeGreaterThan(0);
  });

  it('Given a registered passphrase, When verified with the same passphrase, Then a CryptoKey is returned', async () => {
    const record = await registerVaultPassphrase('CorrectHorseBatteryStaple2026!');

    const key = await verifyVaultPassphrase('CorrectHorseBatteryStaple2026!', record);

    expect(key).not.toBeNull();
  });

  it('Given a registered passphrase, When verified with a different passphrase, Then verification is rejected', async () => {
    const record = await registerVaultPassphrase('CorrectHorseBatteryStaple2026!');

    const key = await verifyVaultPassphrase('AnIncorrectGuess!', record);

    expect(key).toBeNull();
  });

  it('Given two passphrases registered separately, When each is registered, Then they produce different salts', async () => {
    const recordA = await registerVaultPassphrase('FirstPassphrase!');
    const recordB = await registerVaultPassphrase('SecondPassphrase!');

    expect(recordA.saltHex).not.toBe(recordB.saltHex);
  });

  it('Given a registered passphrase, When registered, Then the stored verifier is not the raw decryption key', async () => {
    // A verifier's whole purpose is to confirm a passphrase without ever
    // holding key material that can decrypt the vault on its own. Recompute
    // the raw derived key directly, the same way registerVaultPassphrase
    // does internally, and prove the stored verifier is not that value --
    // otherwise anyone who reads a VaultPassphraseRecord (a debug log, a
    // future "remember my vault" persistence, a memory dump) would have the
    // literal AES-GCM key, no passphrase required.
    const passphrase = 'CorrectHorseBatteryStaple2026!';
    const record = await registerVaultPassphrase(passphrase);

    const { key: rawKey } = await deriveKeyFromPassphrase(passphrase, record.saltHex);
    const rawKeyHex = await exportKeyToHex(rawKey);

    expect(record.verifierHex).not.toBe(rawKeyHex);
  });
});
