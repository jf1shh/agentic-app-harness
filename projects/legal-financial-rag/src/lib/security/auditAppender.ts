import { createChainedAuditEntry } from './hashChain';
import type { AuditLogEntry } from '../schemas';

/** Serialize hashing and publication so concurrent actions cannot fork the chain. */
export function createAuditAppender(publish: (entry: AuditLogEntry) => void) {
  let previous: AuditLogEntry | null = null;
  let tail = Promise.resolve();
  return (data: Parameters<typeof createChainedAuditEntry>[1]): Promise<AuditLogEntry> => {
    const next = tail.then(async () => {
      const entry = await createChainedAuditEntry(previous, data);
      publish(entry);
      previous = entry;
      return entry;
    });
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}
