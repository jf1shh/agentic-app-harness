import { deriveKeyFromPassphrase, exportKeyToHex } from './encryption';

export interface VaultPassphraseRecord {
  saltHex: string;
  verifierHex: string;
}

export async function registerVaultPassphrase(passphrase: string): Promise<VaultPassphraseRecord> {
  const { key, saltHex } = await deriveKeyFromPassphrase(passphrase);
  const verifierHex = await exportKeyToHex(key);
  return { saltHex, verifierHex };
}

export async function verifyVaultPassphrase(
  passphrase: string,
  record: VaultPassphraseRecord
): Promise<CryptoKey | null> {
  const { key, saltHex } = await deriveKeyFromPassphrase(passphrase, record.saltHex);
  const verifierHex = await exportKeyToHex(key);

  if (saltHex !== record.saltHex || verifierHex !== record.verifierHex) {
    return null;
  }

  return key;
}
