import React, { useState } from 'react';
import { FileText, Upload, Database, FileCode } from 'lucide-react';
import { DocumentChunk, FinancialDocument, SecurityPrivilegeLevel } from '../lib/schemas';
import { chunkDocument } from '../lib/rag/chunker';
import { calculateSHA256 } from '../lib/security/encryption';
import { sanitizeInput } from '../lib/security/sanitizer';

interface DocumentManagerProps {
  documents: FinancialDocument[];
  chunks: DocumentChunk[];
  onDocumentAdded: (newDoc: FinancialDocument, newChunks: DocumentChunk[]) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  chunks,
  onDocumentAdded,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');
  const [newEntity, setNewEntity] = useState('');
  const [newType, setNewType] = useState<
    '10K_FILING' | 'CREDIT_AGREEMENT' | 'MA_CONTRACT' | 'AUDIT_REPORT' | 'TAX_RETURN' | 'LOAN_COVENANT'
  >('CREDIT_AGREEMENT');
  const [newPrivilege, setNewPrivilege] = useState<SecurityPrivilegeLevel>('CONFIDENTIAL');
  const [newContent, setNewContent] = useState('');

  const selectedDocument = documents.find((d) => d.id === selectedDocId) || documents[0];
  const docChunks = chunks.filter((c) => c.documentId === selectedDocument?.id);

  const handleIngestCustomDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    // Hardening Layer 3: Sanitize Document Content & Title
    const { sanitizedText: sanitizedContent } = sanitizeInput(newContent);
    const { sanitizedText: sanitizedTitle } = sanitizeInput(newTitle);

    const docId = `doc-custom-${Date.now()}`;
    const hash = await calculateSHA256(sanitizedContent);

    const createdChunks = chunkDocument(sanitizedContent, {
      documentId: docId,
      documentTitle: sanitizedTitle,
      entityName: newEntity || 'Custom Entity',
      documentType: newType,
      privilegeLevel: newPrivilege,
    });

    const newDoc: FinancialDocument = {
      id: docId,
      title: sanitizedTitle,
      documentType: newType,
      entityName: newEntity || 'Custom Entity',
      fileSize: sanitizedContent.length,
      uploadTimestamp: new Date().toISOString(),
      privilegeLevel: newPrivilege,
      chunksCount: createdChunks.length,
      status: 'INDEXED',
      sha256Hash: hash,
      isSample: false,
      content: sanitizedContent,
    };

    onDocumentAdded(newDoc, createdChunks);
    setSelectedDocId(docId);
    setNewTitle('');
    setNewContent('');
  };

  return (
    <div className="view-card" id="document-manager-view">
      <h2 className="section-title">Legal Document Ingestion & Chunk Inspector</h2>
      <p className="section-desc">
        Explore pre-loaded corporate contracts or ingest custom legal filings. Chunks are automatically indexed into local memory.
      </p>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {/* Document Library Table */}
        <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} color="var(--accent-amber)" aria-hidden="true" /> Indexed Document Vault ({documents.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                id={`doc-card-${doc.id}`}
                style={{
                  background: selectedDocId === doc.id ? 'var(--bg-card-hover)' : 'var(--bg-main)',
                  border: `1px solid ${selectedDocId === doc.id ? 'var(--accent-amber)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {doc.title}
                  </span>
                  <span className={`badge-privilege badge-${doc.privilegeLevel}`}>
                    {doc.privilegeLevel.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Entity: {doc.entityName}</span>
                  <span>{doc.chunksCount} Chunks | SHA: {doc.sha256Hash.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Document Upload / Ingestion Form */}
        <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} color="var(--accent-amber)" aria-hidden="true" /> Ingest New Legal Contract
          </h3>

          <form onSubmit={handleIngestCustomDocument} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label htmlFor="input-doc-title" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Document Title:
              </label>
              <input
                id="input-doc-title"
                type="text"
                placeholder="e.g. Acme Corp Credit Facility Agreement 2025"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="input-doc-entity" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Entity Name:
                </label>
                <input
                  id="input-doc-entity"
                  type="text"
                  placeholder="Acme Corp"
                  value={newEntity}
                  onChange={(e) => setNewEntity(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label htmlFor="select-doc-privilege" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Privilege Classification:
                </label>
                <select
                  id="select-doc-privilege"
                  value={newPrivilege}
                  onChange={(e) => setNewPrivilege(e.target.value as SecurityPrivilegeLevel)}
                  style={{ width: '100%' }}
                >
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="ATTORNEY_CLIENT_PRIVILEGE">Attorney-Client Privilege</option>
                  <option value="WORK_PRODUCT">Work Product</option>
                  <option value="PUBLIC_RESTRICTED">Public Restricted</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="select-doc-type" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Document Type:
              </label>
              <select
                id="select-doc-type"
                value={newType}
                onChange={(e) =>
                  setNewType(
                    e.target.value as
                      | '10K_FILING'
                      | 'CREDIT_AGREEMENT'
                      | 'MA_CONTRACT'
                      | 'AUDIT_REPORT'
                      | 'TAX_RETURN'
                      | 'LOAN_COVENANT'
                  )
                }
                style={{ width: '100%', marginBottom: '0.5rem' }}
              >
                <option value="CREDIT_AGREEMENT">Credit Agreement</option>
                <option value="10K_FILING">10-K Filing</option>
                <option value="MA_CONTRACT">M&amp;A Contract</option>
                <option value="AUDIT_REPORT">Audit Report</option>
                <option value="LOAN_COVENANT">Loan Covenant</option>
              </select>
            </div>

            <div>
              <label htmlFor="textarea-doc-content" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Contract / Document Text:
              </label>
              <textarea
                id="textarea-doc-content"
                rows={4}
                placeholder="Paste contract terms, 10-K sections, debt ratio covenants..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
                required
              />
            </div>

            <button id="btn-ingest-doc" type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              <FileCode size={16} aria-hidden="true" /> Parse &amp; Chunk Document Locally
            </button>
          </form>
        </div>
      </div>

      {/* Selected Document Chunks Inspector */}
      {selectedDocument && (
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--accent-amber)" aria-hidden="true" /> Chunk Inspector: {selectedDocument.title} ({docChunks.length} Chunks)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {docChunks.map((chk, i) => (
              <div
                key={chk.id}
                style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
                      Chunk #{i + 1} ({chk.id})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Section: {chk.sectionTitle} | Page {chk.pageNumber}
                    </span>
                  </div>
                  <span className={`badge-privilege badge-${chk.privilegeLevel}`}>
                    {chk.privilegeLevel.replace(/_/g, ' ')}
                  </span>
                </div>

                <div
                  style={{
                    background: 'var(--bg-main)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {chk.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
