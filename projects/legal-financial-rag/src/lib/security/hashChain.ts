import { AuditLogEntry } from '../schemas';
import { calculateSHA256 } from './encryption';

/**
 * Cryptographic Blockchain-Style Tamper-Evident Audit Ledger.
 * Chains each audit log entry to the previous entry's SHA-256 hash stamp.
 */

export const GENESIS_HASH = 'GENESIS_BLOCK_00000000000000000000000000000000';

export async function createChainedAuditEntry(
  prevEntry: AuditLogEntry | null,
  data: {
    action: AuditLogEntry['action'];
    userRole: AuditLogEntry['userRole'];
    details: string;
  }
): Promise<AuditLogEntry> {
  const previousHash = prevEntry ? prevEntry.hash : GENESIS_HASH;
  const timestamp = new Date().toISOString();
  const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Hash formula: SHA-256(previousHash + timestamp + userRole + action + details)
  const payloadToHash = `${previousHash}:${timestamp}:${data.userRole}:${data.action}:${data.details}`;
  const hash = await calculateSHA256(payloadToHash);

  return {
    id,
    timestamp,
    action: data.action,
    userRole: data.userRole,
    details: data.details,
    previousHash,
    hash,
  };
}

export async function verifyAuditChain(
  logs: AuditLogEntry[]
): Promise<{ isValid: boolean; brokenIndex?: number; details?: string }> {
  if (logs.length === 0) return { isValid: true };

  // Traverse logs from oldest (last item if reversed, or index 0)
  for (let i = logs.length - 1; i >= 0; i--) {
    const current = logs[i];
    const nextInChain = i > 0 ? logs[i - 1] : null;

    const payloadToHash = `${current.previousHash}:${current.timestamp}:${current.userRole}:${current.action}:${current.details}`;
    const expectedHash = await calculateSHA256(payloadToHash);

    if (current.hash !== expectedHash) {
      return {
        isValid: false,
        brokenIndex: i,
        details: `Tamper detected at entry #${current.id}! Calculated hash mismatch.`,
      };
    }

    if (nextInChain && nextInChain.previousHash !== current.hash) {
      return {
        isValid: false,
        brokenIndex: i - 1,
        details: `Hash chain broken between entry #${current.id} and #${nextInChain.id}!`,
      };
    }
  }

  return { isValid: true, details: 'Cryptographic hash chain 100% verified.' };
}
