import React, { useRef } from 'react';
import { ShieldCheck, Search, FileText, EyeOff, FileSpreadsheet, Lock } from 'lucide-react';

type TabId = 'query' | 'documents' | 'redaction' | 'audit';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  userRole: 'MANAGING_PARTNER' | 'LEGAL_COUNSEL' | 'FINANCIAL_AUDITOR' | 'PARALEGAL';
  setUserRole: (role: 'MANAGING_PARTNER' | 'LEGAL_COUNSEL' | 'FINANCIAL_AUDITOR' | 'PARALEGAL') => void;
  onLockVault: () => void;
}

const TABS: { id: TabId; label: string; icon: typeof Search; panelId: string }[] = [
  { id: 'query', label: 'Query Workbench', icon: Search, panelId: 'panel-query-workbench' },
  { id: 'documents', label: 'Documents & Chunks', icon: FileText, panelId: 'panel-document-library' },
  { id: 'redaction', label: 'PII Masking', icon: EyeOff, panelId: 'panel-pii-redaction' },
  { id: 'audit', label: 'Audit Ledger', icon: FileSpreadsheet, panelId: 'panel-audit-ledger' },
];

const TAB_DOM_ID: Record<TabId, string> = {
  query: 'tab-query-workbench',
  documents: 'tab-document-library',
  redaction: 'tab-pii-redaction',
  audit: 'tab-audit-ledger',
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  onLockVault,
}) => {
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const nextTab = TABS[(currentIndex + delta + TABS.length) % TABS.length].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

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

      <div className="nav-tabs" role="tablist" aria-label="Main Navigation" onKeyDown={handleTabKeyDown}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={TAB_DOM_ID[tab.id]}
              ref={(el) => { tabRefs.current[tab.id] = el; }}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={isActive}
              aria-controls={tab.panelId}
              tabIndex={isActive ? 0 : -1}
              role="tab"
            >
              <Icon size={16} aria-hidden="true" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
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
