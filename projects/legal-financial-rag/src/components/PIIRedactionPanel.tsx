import React, { useState } from 'react';
import { EyeOff, Eye, ShieldAlert } from 'lucide-react';
import { DocumentChunk } from '../lib/schemas';
import { detectAndRedactPII } from '../lib/security/piiRedactor';

interface PIIRedactionPanelProps {
  chunks: DocumentChunk[];
}

export const PIIRedactionPanel: React.FC<PIIRedactionPanelProps> = ({ chunks }) => {
  const [unmaskedTags, setUnmaskedTags] = useState<Set<string>>(new Set());

  const allRedactionResults = chunks.map((c) => ({
    chunkId: c.id,
    docTitle: c.documentTitle,
    ...detectAndRedactPII(c.content),
  }));

  const totalPII = allRedactionResults.reduce((sum, r) => sum + r.piiCount, 0);

  const toggleTagMask = (tagId: string) => {
    const updated = new Set(unmaskedTags);
    if (updated.has(tagId)) {
      updated.delete(tagId);
    } else {
      updated.add(tagId);
    }
    setUnmaskedTags(updated);
  };

  return (
    <div className="view-card" id="pii-redaction-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="section-title">Automated PII & Legal Tax ID Redaction Pipeline</h2>
          <p className="section-desc">
            Client-side pattern recognition automatically detects and masks SSNs, EIN Tax IDs, and Bank Routing Numbers before RAG indexing.
          </p>
        </div>
        <div
          style={{
            background: 'rgba(4, 120, 87, 0.2)',
            border: '1px solid rgba(4, 120, 87, 0.4)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#34d399',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <ShieldAlert size={18} aria-hidden="true" /> {totalPII} Sensitive Elements Masked
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {allRedactionResults
          .filter((r) => r.tags.length > 0)
          .map((res) => (
            <div
              key={res.chunkId}
              style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
                  {res.docTitle} ({res.tags.length} Sensitive Tags Found)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Chunk ID: {res.chunkId}
                </span>
              </div>

              {/* Tag Badges List */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {res.tags.map((tag) => {
                  const isUnmasked = unmaskedTags.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      id={`tag-toggle-${tag.id}`}
                      type="button"
                      onClick={() => toggleTagMask(tag.id)}
                      style={{
                        background: isUnmasked ? 'rgba(190, 18, 60, 0.2)' : 'rgba(4, 120, 87, 0.2)',
                        border: `1px solid ${isUnmasked ? '#be123c' : '#047857'}`,
                        color: isUnmasked ? '#fda4af' : '#6ee7b7',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                    >
                      {isUnmasked ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                      <span>[{tag.type}]</span>
                      <strong>{isUnmasked ? tag.originalText : tag.redactedPlaceholder}</strong>
                    </button>
                  );
                })}
              </div>

              {/* Chunk Text Preview */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                }}
              >
                {res.tags.reduce((txt, tag) => {
                  const isUnmasked = unmaskedTags.has(tag.id);
                  const searchVal = isUnmasked ? tag.redactedPlaceholder : tag.originalText;
                  const replaceVal = isUnmasked ? tag.originalText : tag.redactedPlaceholder;
                  return txt.replace(searchVal, replaceVal);
                }, res.redactedText)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
