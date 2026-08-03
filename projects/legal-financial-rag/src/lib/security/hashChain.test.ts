import { describe, it, expect } from 'vitest';
import { createChainedAuditEntry, verifyAuditChain, GENESIS_HASH } from './hashChain';
import { AuditLogEntry } from '../schemas';

// verifyAuditChain is the only check the app runs before telling a reviewer
// "Cryptographic hash chain 100% verified" (AuditLogView.tsx). src/lib/unit.test.ts
// already proves it catches an edited field on a single entry; these cases
// push on the chain-level guarantees a tamper-evident ledger actually needs
// to make: that the log traces back to a real genesis, that nothing has been
// spliced out, and that reordering is caught.

describe('verifyAuditChain', () => {
  // RED: verifyAuditChain checks that each entry's own hash matches its
  // stored fields, and that each entry links to the one after it — but it
  // never checks that the *earliest* entry actually anchors to GENESIS_HASH.
  // An attacker who can rewrite the log (e.g. by editing localStorage/IndexedDB
  // directly, which this 100%-client-side app trusts) can start a completely
  // fabricated sub-chain — internally self-consistent, but never rooted in the
  // real genesis block — and it would verify as 100% valid.
  it('Given a self-consistent audit chain that does not anchor to GENESIS_HASH, When it is verified, Then it is rejected', async () => {
    // A forged "root" entry: its own hash is computed correctly from its own
    // fields, but its previousHash is fabricated rather than GENESIS_HASH.
    const forgedRoot = await createChainedAuditEntry(
      { hash: 'FORGED_PREVIOUS_HASH_NOT_GENESIS' } as AuditLogEntry,
      {
        action: 'DOCUMENT_INDEXED',
        userRole: 'MANAGING_PARTNER',
        details: 'Fabricated root entry spliced into the ledger',
      },
    );
    const entry2 = await createChainedAuditEntry(forgedRoot, {
      action: 'QUERY_EXECUTED',
      userRole: 'LEGAL_COUNSEL',
      details: 'Query run against the forged sub-chain',
    });

    const logs = [entry2, forgedRoot]; // most recent first
    const verification = await verifyAuditChain(logs);

    expect(verification.isValid).toBe(false);
  });

  it('Given a chain whose earliest entry correctly anchors to GENESIS_HASH, When it is verified, Then it is accepted', async () => {
    const genesisEntry = await createChainedAuditEntry(null, {
      action: 'DOCUMENT_INDEXED',
      userRole: 'MANAGING_PARTNER',
      details: 'Real genesis entry',
    });
    expect(genesisEntry.previousHash).toBe(GENESIS_HASH);

    const entry2 = await createChainedAuditEntry(genesisEntry, {
      action: 'QUERY_EXECUTED',
      userRole: 'LEGAL_COUNSEL',
      details: 'Legitimate follow-up entry',
    });

    const verification = await verifyAuditChain([entry2, genesisEntry]);
    expect(verification.isValid).toBe(true);
  });

  describe('reordering and deletion (backfilled coverage)', () => {
    // Backfilled (.agents/AGENTS.md §5.4): verifyAuditChain already detects
    // these cases via its previousHash linkage check — proved by mutation
    // (see PR body): removing the `nextInChain.previousHash !== current.hash`
    // check makes both assertions below pass incorrectly.
    it('Given two valid entries whose order has been swapped in the log, When it is verified, Then the mismatch is detected', async () => {
      const e1 = await createChainedAuditEntry(null, {
        action: 'DOCUMENT_INDEXED',
        userRole: 'MANAGING_PARTNER',
        details: 'Entry one',
      });
      const e2 = await createChainedAuditEntry(e1, {
        action: 'QUERY_EXECUTED',
        userRole: 'LEGAL_COUNSEL',
        details: 'Entry two',
      });
      const e3 = await createChainedAuditEntry(e2, {
        action: 'EXPORT_AUDIT',
        userRole: 'FINANCIAL_AUDITOR',
        details: 'Entry three',
      });

      // Correct order (most recent first) is [e3, e2, e1]; swap e2 and e3.
      const reordered = [e2, e3, e1];
      const verification = await verifyAuditChain(reordered);

      expect(verification.isValid).toBe(false);
    });

    it('Given a middle entry removed from an otherwise valid chain, When it is verified, Then the gap is detected', async () => {
      const e1 = await createChainedAuditEntry(null, {
        action: 'DOCUMENT_INDEXED',
        userRole: 'MANAGING_PARTNER',
        details: 'Entry one',
      });
      const e2 = await createChainedAuditEntry(e1, {
        action: 'QUERY_EXECUTED',
        userRole: 'LEGAL_COUNSEL',
        details: 'Entry two (will be deleted)',
      });
      const e3 = await createChainedAuditEntry(e2, {
        action: 'EXPORT_AUDIT',
        userRole: 'FINANCIAL_AUDITOR',
        details: 'Entry three',
      });

      const withGap = [e3, e1]; // e2 spliced out
      const verification = await verifyAuditChain(withGap);

      expect(verification.isValid).toBe(false);
    });
  });

  it('Given an empty audit log, When it is verified, Then it is trivially valid', async () => {
    const verification = await verifyAuditChain([]);
    expect(verification.isValid).toBe(true);
  });
});
