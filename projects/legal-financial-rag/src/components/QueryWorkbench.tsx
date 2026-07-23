import React, { useState } from 'react';
import { Search, Sparkles, Sliders, Shield, BookOpen, Clock, Hash, CheckCircle, AlertTriangle } from 'lucide-react';
import { DocumentChunk, RAGResponse, SecurityPrivilegeLevel } from '../lib/schemas';
import { processRAGQuery } from '../lib/rag/queryProcessor';
import { sanitizeInput } from '../lib/security/sanitizer';

interface QueryWorkbenchProps {
  chunks: DocumentChunk[];
  selectedPrivileges: SecurityPrivilegeLevel[];
  togglePrivilege: (level: SecurityPrivilegeLevel) => void;
  onQueryProcessed: (response: RAGResponse) => void;
}

export const QueryWorkbench: React.FC<QueryWorkbenchProps> = ({
  chunks,
  selectedPrivileges,
  togglePrivilege,
  onQueryProcessed,
}) => {
  const [queryText, setQueryText] = useState('');
  const [hybridWeight, setHybridWeight] = useState(0.4);
  const [topK, setTopK] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ragResponse, setRagResponse] = useState<RAGResponse | null>(null);
  const [sanitizerWarning, setSanitizerWarning] = useState<string | null>(null);

  const samplePrompts = [
    'What are the debt leverage ratio triggers in the Tesla credit agreement?',
    'What is the indemnification cap limit and escrow amount in Section 8?',
    'Show legal risk contingencies and accrued litigation reserves in Note 14.',
    'What are the Series B Liquidation Preference multiplier terms?',
  ];

  const handleExecuteQuery = async (textToRun?: string) => {
    const rawText = textToRun || queryText;
    if (!rawText.trim()) return;

    // Hardening Layer 3: ReDoS-Safe Input Sanitizer & Prompt Injection Shield
    const { sanitizedText, isSanitized, warnings } = sanitizeInput(rawText);
    if (isSanitized && warnings.length > 0) {
      setSanitizerWarning(warnings[0]);
    } else {
      setSanitizerWarning(null);
    }

    setIsProcessing(true);
    try {
      const response = await processRAGQuery({
        queryText: sanitizedText,
        chunks,
        allowedPrivilegeLevels: selectedPrivileges,
        topK,
        hybridWeight,
      });

      setRagResponse(response);
      onQueryProcessed(response);
    } catch (err) {
      console.error('Error executing query:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const allPrivileges: SecurityPrivilegeLevel[] = [
    'CONFIDENTIAL',
    'ATTORNEY_CLIENT_PRIVILEGE',
    'WORK_PRODUCT',
    'PUBLIC_RESTRICTED',
  ];

  return (
    <div className="view-card" id="query-workbench-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="section-title">Natural Language Legal Financial RAG Workbench</h2>
          <p className="section-desc">
            Execute high-precision grounded vector & BM25 queries across private financial filings and legal contracts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Privilege Filter:</span>
          {allPrivileges.map((lvl) => (
            <button
              key={lvl}
              type="button"
              id={`priv-filter-${lvl}`}
              className={`badge-privilege badge-${lvl}`}
              style={{
                opacity: selectedPrivileges.includes(lvl) ? 1 : 0.4,
                cursor: 'pointer',
              }}
              onClick={() => togglePrivilege(lvl)}
              aria-label={`Toggle privilege level ${lvl}`}
            >
              {lvl.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {sanitizerWarning && (
        <div
          id="sanitizer-warning-banner"
          style={{
            background: 'rgba(217, 119, 6, 0.2)',
            border: '1px solid rgba(217, 119, 6, 0.4)',
            color: '#fbbf24',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={16} aria-hidden="true" /> {sanitizerWarning}
        </div>
      )}

      {/* Query Controls Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            id="rag-query-input"
            type="text"
            placeholder="Ask any financial covenant, clause limit, or tax liability question..."
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
            style={{ flex: 1, fontSize: '1rem', padding: '0.75rem 1rem' }}
            aria-label="Financial RAG Query Input"
          />
          <button
            id="btn-run-query"
            className="btn-primary"
            onClick={() => handleExecuteQuery()}
            disabled={isProcessing || !queryText.trim()}
            style={{ minWidth: '140px', justifyContent: 'center' }}
          >
            {isProcessing ? (
              'Searching...'
            ) : (
              <>
                <Search size={18} aria-hidden="true" /> Run RAG Query
              </>
            )}
          </button>
        </div>

        {/* Prompt Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={14} aria-hidden="true" /> Sample Legal Queries:
          </span>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              id={`chip-prompt-${i}`}
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              onClick={() => {
                setQueryText(prompt);
                handleExecuteQuery(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Search Engine Hyper-Parameters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            background: 'var(--bg-sidebar)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <Sliders size={16} color="var(--accent-amber)" aria-hidden="true" />
            <label htmlFor="hybrid-slider" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', minWidth: '160px' }}>
              Hybrid Weight (Vector vs BM25):
            </label>
            <input
              id="hybrid-slider"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={hybridWeight}
              onChange={(e) => setHybridWeight(parseFloat(e.target.value))}
              style={{ flex: 1, cursor: 'pointer' }}
              aria-label="Hybrid Search Weight Slider"
            />
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', minWidth: '90px' }}>
              {Math.round((1 - hybridWeight) * 100)}% Vec / {Math.round(hybridWeight * 100)}% BM25
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="select-top-k" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Top K Citations:
            </label>
            <select
              id="select-top-k"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              aria-label="Select Top K Citations"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>
        </div>
      </div>

      {/* RAG Results Display */}
      {ragResponse && (
        <div id="rag-response-container" style={{ marginTop: '2rem' }}>
          <div
            style={{
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} color="#34d399" aria-hidden="true" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Grounded Legal Synthesis Answer</h3>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} aria-hidden="true" /> {ragResponse.executionTimeMs} ms
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Shield size={14} aria-hidden="true" /> Confidence: {Math.round(ragResponse.confidenceScore * 100)}%
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Hash size={14} aria-hidden="true" /> Stamp: {ragResponse.securityAuditHash.slice(0, 10)}...
                </span>
              </div>
            </div>

            <div
              id="rag-answer-text"
              style={{
                whiteSpace: 'pre-line',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                fontSize: '0.95rem',
              }}
            >
              {ragResponse.answerText}
            </div>
          </div>

          {/* Citations Grid */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="var(--accent-amber)" aria-hidden="true" /> Grounded Evidentiary Citations ({ragResponse.citations.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ragResponse.citations.map((citation, idx) => (
              <div
                key={citation.chunkId}
                className="citation-card"
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
                      [{idx + 1}] {citation.documentTitle}
                    </span>
                    <span className={`badge-privilege badge-${citation.privilegeLevel}`}>
                      {citation.privilegeLevel.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {citation.sectionTitle} | Page {citation.pageNumber} | Score: {Math.round(citation.score * 100)}%
                  </span>
                </div>

                <div
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.875rem',
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                  }}
                >
                  "{citation.snippet}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
