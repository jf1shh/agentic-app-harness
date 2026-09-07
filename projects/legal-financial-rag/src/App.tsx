import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { QueryWorkbench } from './components/QueryWorkbench';
import { DocumentManager } from './components/DocumentManager';
import { PIIRedactionPanel } from './components/PIIRedactionPanel';
import { AuditLogView } from './components/AuditLogView';
import { VaultLockModal } from './components/VaultLockModal';
import { WatermarkOverlay } from './components/WatermarkOverlay';
import { AuditLogEntry, DocumentChunk, FinancialDocument, RAGResponse, SecurityPrivilegeLevel } from './lib/schemas';
import { SAMPLE_DOCUMENTS } from './lib/datasets/authenticSampleDocs';
import { chunkDocument } from './lib/rag/chunker';
import { calculateSHA256 } from './lib/security/encryption';
import { createAuditAppender } from './lib/security/auditAppender';
import { useAutoLock } from './lib/hooks/useAutoLock';
import { VaultPassphraseRecord, registerVaultPassphrase, verifyVaultPassphrase } from './lib/security/vaultAuth';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'query' | 'documents' | 'redaction' | 'audit'>('query');
  const [userRole, setUserRole] = useState<'MANAGING_PARTNER' | 'LEGAL_COUNSEL' | 'FINANCIAL_AUDITOR' | 'PARALEGAL'>('LEGAL_COUNSEL');
  const [selectedPrivileges, setSelectedPrivileges] = useState<SecurityPrivilegeLevel[]>([
    'CONFIDENTIAL',
    'ATTORNEY_CLIENT_PRIVILEGE',
    'WORK_PRODUCT',
    'PUBLIC_RESTRICTED',
  ]);

  const [documents, setDocuments] = useState<FinancialDocument[]>(SAMPLE_DOCUMENTS);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [appendAudit] = useState(() => createAuditAppender((entry) => setAuditLogs((prev) => [entry, ...prev])));
  const initialized = useRef(false);
  const [lastResponse, setLastResponse] = useState<RAGResponse | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  // Which of the two lock triggers actually fired — threaded through to
  // VaultLockModal so its copy says why the vault locked instead of always
  // blaming inactivity, even when the user clicked "Lock Vault" on purpose.
  const [lockReason, setLockReason] = useState<'idle' | 'manual'>('manual');
  // Set the first time the vault is unlocked; every unlock after that must
  // reproduce this same passphrase, or VaultLockModal rejects it. Session-only
  // by design — it resets on reload along with everything else in state.
  const [vaultPassphraseRecord, setVaultPassphraseRecord] = useState<VaultPassphraseRecord | null>(null);

  // Initialize sample document chunks and chained audit ledger
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function initVault() {
      const initialChunks: DocumentChunk[] = [];
      const preparedDocuments: FinancialDocument[] = [];
      for (const doc of SAMPLE_DOCUMENTS) {
        const created = chunkDocument(doc.content, {
          documentId: doc.id,
          documentTitle: doc.title,
          entityName: doc.entityName,
          documentType: doc.documentType,
          privilegeLevel: doc.privilegeLevel,
        });
        initialChunks.push(...created);
        preparedDocuments.push({ ...doc, chunksCount: created.length,
          fileSize: new TextEncoder().encode(doc.content).length,
          sha256Hash: await calculateSHA256(doc.content) });
      }
      setDocuments(preparedDocuments);
      setChunks(initialChunks);

      // Create Genesis Chained Audit Entry
      await appendAudit({
        action: 'DOCUMENT_INDEXED',
        userRole: 'MANAGING_PARTNER',
        details: `Initialized sample financial workspace with ${SAMPLE_DOCUMENTS.length} legal filings (${initialChunks.length} chunks indexed locally).`,
      });

    }
    initVault();
  }, [appendAudit]);

  const handleLockVault = async (reason: 'idle' | 'manual') => {
    setIsLocked(true);
    setLastResponse(null);
    setLockReason(reason);

    await appendAudit({
      action: 'VAULT_LOCKED',
      userRole,
      details:
        reason === 'idle'
          ? 'Vault auto-locked after 5 minutes of inactivity. Session view hidden.'
          : 'Vault manually locked by user. Session view hidden.',
    });
  };

  // useAutoLock resets its idle timer whenever the callback identity it's
  // given changes — an inline arrow here would be recreated on every App
  // re-render (e.g. switching tabs), silently treating unrelated re-renders
  // as user activity and extending the idle window past 5 real minutes. The
  // ref keeps the callback identity stable across renders while still
  // calling the latest handleLockVault (which closes over current state).
  const handleLockVaultRef = useRef(handleLockVault);
  handleLockVaultRef.current = handleLockVault;
  const handleIdleLock = useCallback(() => {
    handleLockVaultRef.current('idle');
  }, []);

  // Inactivity Auto-Lock (5 Minutes)
  useAutoLock(isLocked, handleIdleLock, 300000);

  const handleAttemptUnlock = async (passphrase: string): Promise<CryptoKey | null> => {
    if (!vaultPassphraseRecord) {
      const record = await registerVaultPassphrase(passphrase);
      setVaultPassphraseRecord(record);
      return verifyVaultPassphrase(passphrase, record);
    }
    return verifyVaultPassphrase(passphrase, vaultPassphraseRecord);
  };

  const handleUnlockSuccess = async (_key: CryptoKey, _passphrase: string) => {
    setIsLocked(false);

    await appendAudit({
      action: 'VAULT_UNLOCKED',
      userRole,
      details: 'Session view unlocked after passphrase verification.',
    });
  };

  const togglePrivilege = (level: SecurityPrivilegeLevel) => {
    if (selectedPrivileges.includes(level)) {
      if (selectedPrivileges.length === 1) return;
      setSelectedPrivileges(selectedPrivileges.filter((l) => l !== level));
    } else {
      setSelectedPrivileges([...selectedPrivileges, level]);
    }
  };

  const handleDocumentAdded = async (newDoc: FinancialDocument, newChunks: DocumentChunk[]) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setChunks((prev) => [...newChunks, ...prev]);

    await appendAudit({
      action: 'DOCUMENT_UPLOAD',
      userRole,
      details: `Ingested & indexed document "${newDoc.title}" (${newChunks.length} chunks created).`,
    });
  };

  const handleQueryProcessed = async (response: RAGResponse) => {
    setLastResponse(response);
    await appendAudit({
      action: 'QUERY_EXECUTED',
      userRole,
      details: `Executed RAG query "${response.queryText.slice(0, 40)}..." (${response.citations.length} citations returned).`,
    });
  };

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <WatermarkOverlay label="LEXIVAULT RESEARCH DEMO" />

      {!isLocked && <>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onLockVault={() => handleLockVault('manual')}
      />

      <p role="note" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
        Session-only research demo. Documents disappear on reload. Roles and privilege filters
        demonstrate retrieval controls; this is not an authenticated or encrypted document vault.
        Use sample or non-sensitive material.
      </p>
      <main className="main-wrapper" id="main-content">
        {activeTab === 'query' && (
          <div role="tabpanel" id="panel-query-workbench" aria-labelledby="tab-query-workbench" tabIndex={0}>
            <QueryWorkbench
              chunks={chunks}
              selectedPrivileges={selectedPrivileges}
              togglePrivilege={togglePrivilege}
              onQueryProcessed={handleQueryProcessed}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <div role="tabpanel" id="panel-document-library" aria-labelledby="tab-document-library" tabIndex={0}>
            <DocumentManager
              documents={documents}
              chunks={chunks}
              onDocumentAdded={handleDocumentAdded}
            />
          </div>
        )}

        {activeTab === 'redaction' && (
          <div role="tabpanel" id="panel-pii-redaction" aria-labelledby="tab-pii-redaction" tabIndex={0}>
            <PIIRedactionPanel chunks={chunks} />
          </div>
        )}

        {activeTab === 'audit' && (
          <div role="tabpanel" id="panel-audit-ledger" aria-labelledby="tab-audit-ledger" tabIndex={0}>
            <AuditLogView auditLogs={auditLogs} lastResponse={lastResponse} />
          </div>
        )}
      </main>
      </>}

      <VaultLockModal
        isLocked={isLocked}
        isFirstUnlock={vaultPassphraseRecord === null}
        lockReason={lockReason}
        onUnlockSuccess={handleUnlockSuccess}
        onAttemptUnlock={handleAttemptUnlock}
      />
    </div>
  );
};
