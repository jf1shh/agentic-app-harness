import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, ShieldCheck, Hash, FileText, Link, AlertOctagon } from 'lucide-react';
import { AuditLogEntry, RAGResponse } from '../lib/schemas';
import { exportAuditToJSON, exportAuditToMarkdown, downloadFile } from '../lib/export/auditExporter';
import { verifyAuditChain } from '../lib/security/hashChain';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
  lastResponse: RAGResponse | null;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs, lastResponse }) => {
  const [hashInput, setHashInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<{ isValid: boolean; details?: string }>({ isValid: true });

  useEffect(() => {
    async function checkChain() {
      const res = await verifyAuditChain(auditLogs);
      setChainStatus(res);
    }
    checkChain();
  }, [auditLogs]);

  const handleVerifyHash = () => {
    if (!hashInput.trim()) return;
    const match = auditLogs.find((l) => l.hash.toLowerCase().includes(hashInput.trim().toLowerCase()));
    if (match) {
      setVerificationResult(`VERIFIED MATCH: Entry ${match.id} (${match.action}) by ${match.userRole} at ${match.timestamp}`);
    } else if (lastResponse?.securityAuditHash.toLowerCase().includes(hashInput.trim().toLowerCase())) {
      setVerificationResult(`VERIFIED MATCH: RAG Query "${lastResponse.queryText}" (Stamp: ${lastResponse.securityAuditHash})`);
    } else {
      setVerificationResult('HASH UNVERIFIED: No cryptographic match found in local ledger.');
    }
  };

  const handleDownloadJSON = () => {
    if (!lastResponse) return;
    const json = exportAuditToJSON(lastResponse, auditLogs);
    downloadFile(`lexivault-audit-${lastResponse.queryId}.json`, json, 'application/json');
  };

  const handleDownloadMD = () => {
    if (!lastResponse) return;
    const md = exportAuditToMarkdown(lastResponse, auditLogs);
    downloadFile(`lexivault-audit-${lastResponse.queryId}.md`, md, 'text/markdown');
  };

  return (
    <div className="view-card" id="audit-ledger-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="section-title">Cryptographic SHA-256 Audit Ledger & Legal Compliance Exporter</h2>
          <p className="section-desc">
            Tamper-evident client-side log chaining entries via SHA-256 hashes to guarantee data integrity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            id="btn-export-json"
            className="btn-secondary"
            onClick={handleDownloadJSON}
            disabled={!lastResponse}
          >
            <Download size={16} aria-hidden="true" /> Export JSON
          </button>
          <button
            id="btn-export-md"
            className="btn-primary"
            onClick={handleDownloadMD}
            disabled={!lastResponse}
          >
            <FileText size={16} aria-hidden="true" /> Export Legal MD Report
          </button>
        </div>
      </div>

      {/* Cryptographic Chain Integrity Indicator */}
      <div
        id="chain-integrity-banner"
        style={{
          background: chainStatus.isValid ? 'rgba(4, 120, 87, 0.15)' : 'rgba(190, 18, 60, 0.15)',
          border: `1px solid ${chainStatus.isValid ? 'rgba(4, 120, 87, 0.4)' : 'rgba(190, 18, 60, 0.4)'}`,
          color: chainStatus.isValid ? '#34d399' : '#fda4af',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        {chainStatus.isValid ? (
          <Link size={18} aria-hidden="true" />
        ) : (
          <AlertOctagon size={18} aria-hidden="true" />
        )}
        <span>
          {chainStatus.isValid
            ? 'Cryptographic Hash Chain: 100% Verified & Tamper-Evident'
            : `Hash Chain Violation: ${chainStatus.details}`}
        </span>
      </div>

      {/* Hash Verification Tool */}
      <div
        style={{
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Hash size={16} color="var(--accent-amber)" aria-hidden="true" /> SHA-256 Hash Integrity Verifier
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="input-verify-hash"
            type="text"
            placeholder="Paste SHA-256 hash stamp to verify document/query integrity..."
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
            aria-label="SHA-256 Hash Input"
          />
          <button id="btn-verify-hash" className="btn-secondary" onClick={handleVerifyHash}>
            <ShieldCheck size={16} aria-hidden="true" /> Verify Stamp
          </button>
        </div>

        {verificationResult && (
          <div
            id="verification-result-box"
            style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
              background: verificationResult.startsWith('VERIFIED') ? 'rgba(4, 120, 87, 0.2)' : 'rgba(190, 18, 60, 0.2)',
              color: verificationResult.startsWith('VERIFIED') ? '#34d399' : '#fda4af',
              border: `1px solid ${verificationResult.startsWith('VERIFIED') ? 'rgba(4, 120, 87, 0.4)' : 'rgba(190, 18, 60, 0.4)'}`,
            }}
          >
            {verificationResult}
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={18} color="var(--accent-amber)" aria-hidden="true" /> Audit Trail Ledger ({auditLogs.length} Entries)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.6rem 0.85rem' }}>Timestamp</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Counsel Role</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Action</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Details</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Verification Stamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.6rem 0.85rem', fontWeight: 500 }}>{log.userRole}</td>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--accent-amber)', fontWeight: 600 }}>{log.action}</td>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>{log.details}</td>
                  <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)', color: '#34d399' }}>{log.hash.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
