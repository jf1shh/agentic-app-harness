import { deriveKeyFromPassphrase, exportKeyToHex, calculateSHA256 } from './encryption';

export interface VaultPassphraseRecord {
  saltHex: string;
  verifierHex: string;
}

// The verifier must never be (or be reversible into) the actual AES-GCM
// decryption key -- it exists so a re-entered passphrase can be checked
// without ever needing to hold key material that can decrypt the vault on
// its own. Hashing the exported key is one-way, so a VaultPassphraseRecord
// (React state today, but the same shape a future "remember my vault"
// persistence would reach for) reveals nothing that unlocks the vault.
async function deriveVerifierHex(key: CryptoKey): Promise<string> {
  const rawKeyHex = await exportKeyToHex(key);
  return calculateSHA256(rawKeyHex);
}

export async function registerVaultPassphrase(passphrase: string): Promise<VaultPassphraseRecord> {
  const { key, saltHex } = await deriveKeyFromPassphrase(passphrase);
  const verifierHex = await deriveVerifierHex(key);
  return { saltHex, verifierHex };
}

export async function verifyVaultPassphrase(
  passphrase: string,
  record: VaultPassphraseRecord
): Promise<CryptoKey | null> {
  const { key, saltHex } = await deriveKeyFromPassphrase(passphrase, record.saltHex);
  const verifierHex = await deriveVerifierHex(key);

  if (saltHex !== record.saltHex || verifierHex !== record.verifierHex) {
    return null;
  }

  return key;
}
