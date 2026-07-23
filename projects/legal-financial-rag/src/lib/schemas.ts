import { z } from 'zod';

export const SecurityPrivilegeLevelSchema = z.enum([
  'CONFIDENTIAL',
  'ATTORNEY_CLIENT_PRIVILEGE',
  'WORK_PRODUCT',
  'PUBLIC_RESTRICTED',
  'HIGHLY_RESTRICTED',
]);
export type SecurityPrivilegeLevel = z.infer<typeof SecurityPrivilegeLevelSchema>;

export const PIIRedactionTagSchema = z.object({
  id: z.string(),
  type: z.enum(['SSN', 'TAX_ID', 'BANK_ACCOUNT', 'MONETARY_THRESHOLD', 'EMAIL', 'ADDRESS']),
  originalText: z.string(),
  redactedPlaceholder: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  confidence: z.number().min(0).max(1),
  isMasked: z.boolean().default(true),
});
export type PIIRedactionTag = z.infer<typeof PIIRedactionTagSchema>;

export const DocumentChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  sectionTitle: z.string(),
  pageNumber: z.number(),
  content: z.string(),
  redactedContent: z.string(),
  embedding: z.array(z.number()),
  tokens: z.array(z.string()),
  privilegeLevel: SecurityPrivilegeLevelSchema,
  metadata: z.object({
    entityName: z.string(),
    period: z.string().optional(),
    documentType: z.string(),
  }),
});
export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;

export const FinancialDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  documentType: z.enum([
    '10K_FILING',
    'CREDIT_AGREEMENT',
    'MA_CONTRACT',
    'AUDIT_REPORT',
    'TAX_RETURN',
    'LOAN_COVENANT',
  ]),
  entityName: z.string(),
  fileSize: z.number(),
  uploadTimestamp: z.string(),
  privilegeLevel: SecurityPrivilegeLevelSchema,
  chunksCount: z.number(),
  status: z.enum(['INDEXED', 'ENCRYPTED', 'REDACTED']),
  sha256Hash: z.string(),
  isSample: z.boolean().default(false),
  content: z.string(),
});
export type FinancialDocument = z.infer<typeof FinancialDocumentSchema>;

export const RAGQuerySchema = z.object({
  id: z.string(),
  queryText: z.string(),
  timestamp: z.string(),
  privilegeFilter: z.array(SecurityPrivilegeLevelSchema),
  topK: z.number().min(1).max(20),
  hybridWeight: z.number().min(0).max(1),
  status: z.enum(['SUCCESS', 'NO_MATCH', 'RESTRICTED_ACCESS']),
});
export type RAGQuery = z.infer<typeof RAGQuerySchema>;

export const RAGCitationSchema = z.object({
  chunkId: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  sectionTitle: z.string(),
  pageNumber: z.number(),
  snippet: z.string(),
  score: z.number(),
  matchType: z.enum(['VECTOR', 'KEYWORD', 'HYBRID']),
  privilegeLevel: SecurityPrivilegeLevelSchema,
});
export type RAGCitation = z.infer<typeof RAGCitationSchema>;

export const RAGResponseSchema = z.object({
  id: z.string(),
  queryId: z.string(),
  queryText: z.string(),
  answerText: z.string(),
  citations: z.array(RAGCitationSchema),
  executionTimeMs: z.number(),
  tokenCount: z.number(),
  confidenceScore: z.number(),
  securityAuditHash: z.string(),
  piiRedactionCount: z.number(),
});
export type RAGResponse = z.infer<typeof RAGResponseSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.enum([
    'DOCUMENT_UPLOAD',
    'DOCUMENT_INDEXED',
    'QUERY_EXECUTED',
    'PII_REDACTED',
    'PII_UNMASKED',
    'EXPORT_AUDIT',
    'KEY_GENERATION',
    'VAULT_LOCKED',
    'VAULT_UNLOCKED',
  ]),
  userRole: z.enum(['MANAGING_PARTNER', 'LEGAL_COUNSEL', 'FINANCIAL_AUDITOR', 'PARALEGAL']),
  details: z.string(),
  previousHash: z.string().default('GENESIS_BLOCK_00000000000000000000000000000000'),
  hash: z.string(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
