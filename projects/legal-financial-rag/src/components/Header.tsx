import React from 'react';
import { ShieldCheck, Search, FileText, EyeOff, FileSpreadsheet, Lock } from 'lucide-react';

interface HeaderProps {
  activeTab: 'query' | 'documents' | 'redaction' | 'audit';
  setActiveTab: (tab: 'query' | 'documents' | 'redaction' | 'audit') => void;
  userRole: 'MANAGING_PARTNER' | 'LEGAL_COUNSEL' | 'FINANCIAL_AUDITOR' | 'PARALEGAL';
  setUserRole: (role: 'MANAGING_PARTNER' | 'LEGAL_COUNSEL' | 'FINANCIAL_AUDITOR' | 'PARALEGAL') => void;
  onLockVault: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onLockVault,
}) => {
  return (
    <header className="header-nav" role="banner">
      <div className="logo-group">
        <ShieldCheck className="logo-icon" aria-hidden="true" />
        <div>
          <h1 className="logo-title">LexiVault</h1>
          <div className="badge-privacy">
            <Lock size={12} aria-hidden="true" /> 100% Client-Side Private RAG
          </div>
        </div>
      </div>

      <div className="nav-tabs" role="tablist" aria-label="Main Navigation">
        <button
          id="tab-query-workbench"
          className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
          aria-selected={activeTab === 'query'}
          role="tab"
        >
          <Search size={16} aria-hidden="true" /> Query Workbench
        </button>
        <button
          id="tab-document-library"
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
          aria-selected={activeTab === 'documents'}
          role="tab"
        >
          <FileText size={16} aria-hidden="true" /> Documents & Chunks
        </button>
        <button
          id="tab-pii-redaction"
          className={`tab-btn ${activeTab === 'redaction' ? 'active' : ''}`}
          onClick={() => setActiveTab('redaction')}
          aria-selected={activeTab === 'redaction'}
          role="tab"
        >
          <EyeOff size={16} aria-hidden="true" /> PII Masking
        </button>
        <button
          id="tab-audit-ledger"
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
          aria-selected={activeTab === 'audit'}
          role="tab"
        >
          <FileSpreadsheet size={16} aria-hidden="true" /> Audit Ledger
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="role-selector-group">
          <label htmlFor="user-role-select" style={{ fontWeight: 500 }}>
            Counsel Role:
          </label>
          <select
            id="user-role-select"
            value={userRole}
            onChange={(e) =>
              setUserRole(
                e.target.value as
                  | 'MANAGING_PARTNER'
                  | 'LEGAL_COUNSEL'
                  | 'FINANCIAL_AUDITOR'
                  | 'PARALEGAL'
              )
            }
            aria-label="Select User Role"
          >
            <option value="MANAGING_PARTNER">Managing Partner</option>
            <option value="LEGAL_COUNSEL">Legal Counsel</option>
            <option value="FINANCIAL_AUDITOR">Financial Auditor</option>
            <option value="PARALEGAL">Paralegal</option>
          </select>
        </div>

        <button
          id="btn-lock-vault-header"
          type="button"
          className="btn-secondary"
          onClick={onLockVault}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          title="Lock Legal Vault & Zeroize Key Memory"
        >
          <Lock size={14} aria-hidden="true" /> Lock Vault
        </button>
      </div>
    </header>
  );
};
