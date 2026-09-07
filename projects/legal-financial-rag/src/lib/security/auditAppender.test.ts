import { it, expect } from 'vitest';
import { createAuditAppender } from './auditAppender';
import { verifyAuditChain } from './hashChain';
import type { AuditLogEntry } from '../schemas';
it('Given concurrent audit actions, When appended, Then every entry extends one verifiable chain', async () => {
  const logs: AuditLogEntry[] = [];
  const append = createAuditAppender((entry) => logs.unshift(entry));
  await Promise.all(Array.from({ length: 30 }, (_, index) => append({
    action: 'QUERY_EXECUTED', userRole: 'LEGAL_COUNSEL', details: `action ${index}`,
  })));
  expect(logs).toHaveLength(30);
  expect((await verifyAuditChain(logs)).isValid).toBe(true);
});
