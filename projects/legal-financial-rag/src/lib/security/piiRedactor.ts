import { PIIRedactionTag } from '../schemas';

/**
 * Client-Side Automated PII & Legal Tax ID Redaction Engine.
 * Detects sensitive personal identification numbers, tax IDs, routing numbers, and monetary figures.
 */

export interface RedactionResult {
  redactedText: string;
  tags: PIIRedactionTag[];
  piiCount: number;
}

export function detectAndRedactPII(text: string): RedactionResult {
  const tags: PIIRedactionTag[] = [];
  let redactedText = text;

  let ssnCounter = 1;
  let taxCounter = 1;
  let bankCounter = 1;
  let emailCounter = 1;

  // 1. Detect Social Security Numbers (SSN): XXX-XX-XXXX
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  let match: RegExpExecArray | null;

  while ((match = ssnRegex.exec(text)) !== null) {
    const originalText = match[0];
    const placeholder = `[REDACTED_SSN_${ssnCounter++}]`;
    tags.push({
      id: `tag-ssn-${tags.length + 1}`,
      type: 'SSN',
      originalText,
      redactedPlaceholder: placeholder,
      startIndex: match.index,
      endIndex: match.index + originalText.length,
      confidence: 0.99,
      isMasked: true,
    });
  }

  // 2. Detect Employer Identification Numbers (EIN / Tax ID): XX-XXXXXXX
  const einRegex = /\b\d{2}-\d{7}\b/g;
  while ((match = einRegex.exec(text)) !== null) {
    const originalText = match[0];
    const placeholder = `[REDACTED_TAX_ID_${taxCounter++}]`;
    tags.push({
      id: `tag-tax-${tags.length + 1}`,
      type: 'TAX_ID',
      originalText,
      redactedPlaceholder: placeholder,
      startIndex: match.index,
      endIndex: match.index + originalText.length,
      confidence: 0.95,
      isMasked: true,
    });
  }

  // 3. Detect Bank Routing / Account Numbers
  const bankRegex = /\b(?:Routing|Account|IBAN)\s*(?:#|No|Number)?[\s:]*([A-Z0-9]{8,18})\b/gi;
  while ((match = bankRegex.exec(text)) !== null) {
    const originalText = match[0];
    const placeholder = `[REDACTED_BANK_ACCT_${bankCounter++}]`;
    tags.push({
      id: `tag-bank-${tags.length + 1}`,
      type: 'BANK_ACCOUNT',
      originalText,
      redactedPlaceholder: placeholder,
      startIndex: match.index,
      endIndex: match.index + originalText.length,
      confidence: 0.92,
      isMasked: true,
    });
  }

  // 4. Detect Email Addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  while ((match = emailRegex.exec(text)) !== null) {
    const originalText = match[0];
    const placeholder = `[REDACTED_EMAIL_${emailCounter++}]`;
    tags.push({
      id: `tag-email-${tags.length + 1}`,
      type: 'EMAIL',
      originalText,
      redactedPlaceholder: placeholder,
      startIndex: match.index,
      endIndex: match.index + originalText.length,
      confidence: 0.98,
      isMasked: true,
    });
  }

  // Replace all detected instances in redactedText
  for (const tag of tags) {
    redactedText = redactedText.replace(tag.originalText, tag.redactedPlaceholder);
  }

  return {
    redactedText,
    tags,
    piiCount: tags.length,
  };
}

export function togglePIIMask(
  text: string,
  tags: PIIRedactionTag[],
  unmaskedTagIds: Set<string>
): string {
  let result = text;
  for (const tag of tags) {
    if (unmaskedTagIds.has(tag.id)) {
      result = result.replace(tag.redactedPlaceholder, tag.originalText);
    }
  }
  return result;
}
