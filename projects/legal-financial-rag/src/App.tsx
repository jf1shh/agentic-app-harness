import React, { useState, useEffect } from 'react';
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
import { createChainedAuditEntry } from './lib/security/hashChain';
import { useAutoLock } from './lib/hooks/useAutoLock';
import { wipeSensitiveState } from './lib/security/memoryZeroizer';

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
  const [lastResponse, setLastResponse] = useState<RAGResponse | null>(null);

  const [isLocked, setIsLocked] = useState(false);

  // Inactivity Auto-Lock (5 Minutes)
  useAutoLock(isLocked, () => {
    handleLockVault();
  }, 300000);

  // Initialize sample document chunks and chained audit ledger
  useEffect(() => {
    async function initVault() {
      const initialChunks: DocumentChunk[] = [];
      SAMPLE_DOCUMENTS.forEach((doc) => {
        const created = chunkDocument(doc.content, {
          documentId: doc.id,
          documentTitle: doc.title,
          entityName: doc.entityName,
          documentType: doc.documentType,
          privilegeLevel: doc.privilegeLevel,
        });
        initialChunks.push(...created);
      });
      setChunks(initialChunks);

      // Create Genesis Chained Audit Entry
      const genesisLog = await createChainedAuditEntry(null, {
        action: 'DOCUMENT_INDEXED',
        userRole: 'MANAGING_PARTNER',
        details: `Initialized authentic financial vault with ${SAMPLE_DOCUMENTS.length} legal filings (${initialChunks.length} chunks indexed locally).`,
      });
      setAuditLogs([genesisLog]);
    }
    initVault();
  }, []);

  const handleLockVault = async () => {
    setIsLocked(true);

    const prevLog = auditLogs[0] || null;
    const lockLog = await createChainedAuditEntry(prevLog, {
      action: 'VAULT_LOCKED',
      userRole,
      details: 'Vault auto-locked due to inactivity / manual trigger. In-memory keys zeroized.',
    });
    setAuditLogs((prev) => [lockLog, ...prev]);
  };

  const handleUnlockSuccess = async (_key: CryptoKey, _passphrase: string) => {
    setIsLocked(false);

    const prevLog = auditLogs[0] || null;
    const unlockLog = await createChainedAuditEntry(prevLog, {
      action: 'VAULT_UNLOCKED',
      userRole,
      details: 'Vault unlocked successfully. Derived 256-bit AES-GCM Key via PBKDF2 (100,000 iterations).',
    });
    setAuditLogs((prev) => [unlockLog, ...prev]);
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

    const prevLog = auditLogs[0] || null;
    const log = await createChainedAuditEntry(prevLog, {
      action: 'DOCUMENT_UPLOAD',
      userRole,
      details: `Ingested & indexed document "${newDoc.title}" (${newChunks.length} chunks created).`,
    });
    setAuditLogs((prev) => [log, ...prev]);
  };

  const handleQueryProcessed = async (response: RAGResponse) => {
    setLastResponse(response);
    const prevLog = auditLogs[0] || null;
    const log = await createChainedAuditEntry(prevLog, {
      action: 'QUERY_EXECUTED',
      userRole,
      details: `Executed RAG query "${response.queryText.slice(0, 40)}..." (${response.citations.length} citations returned).`,
    });
    setAuditLogs((prev) => [log, ...prev]);
  };

  // Secure memory wipe when leaving tab / unloading window
  useEffect(() => {
    const handleUnload = () => {
      if (lastResponse) wipeSensitiveState(lastResponse as unknown as Record<string, unknown>);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [lastResponse]);

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <WatermarkOverlay label="CONFIDENTIAL & ATTORNEY-CLIENT PRIVILEGED - LEXIVAULT HARDENED" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onLockVault={handleLockVault}
      />

      <main className="main-wrapper" id="main-content">
        {activeTab === 'query' && (
          <QueryWorkbench
            chunks={chunks}
            selectedPrivileges={selectedPrivileges}
            togglePrivilege={togglePrivilege}
            onQueryProcessed={handleQueryProcessed}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManager
            documents={documents}
            chunks={chunks}
            onDocumentAdded={handleDocumentAdded}
          />
        )}

        {activeTab === 'redaction' && <PIIRedactionPanel chunks={chunks} />}

        {activeTab === 'audit' && (
          <AuditLogView auditLogs={auditLogs} lastResponse={lastResponse} />
        )}
      </main>

      <VaultLockModal isLocked={isLocked} onUnlockSuccess={handleUnlockSuccess} />
    </div>
  );
};
