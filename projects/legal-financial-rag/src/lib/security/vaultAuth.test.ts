import { describe, it, expect } from 'vitest';
import { registerVaultPassphrase, verifyVaultPassphrase } from './vaultAuth';

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
});
