/**
 * ReDoS-Safe Input Sanitizer & Prompt Injection Shield.
 * Protects LexiVault RAG from XSS script injections and malicious prompt override payloads.
 */

export interface SanitizationResult {
  sanitizedText: string;
  isSanitized: boolean;
  warnings: string[];
}

export function sanitizeInput(text: string): SanitizationResult {
  if (!text) return { sanitizedText: '', isSanitized: false, warnings: [] };

  const warnings: string[] = [];
  let sanitizedText = text;

  // 1. Enforce length boundaries to prevent ReDoS CPU exhaustion attacks
  if (sanitizedText.length > 50000) {
    sanitizedText = sanitizedText.slice(0, 50000);
    warnings.push('Input truncated to maximum 50,000 characters to prevent ReDoS vulnerability.');
  }

  // 2. Strip HTML tags & inline event handlers
  const htmlTagRegex = /<[^>]*>/g;
  if (htmlTagRegex.test(sanitizedText)) {
    sanitizedText = sanitizedText.replace(htmlTagRegex, '');
    warnings.push('Stripped HTML tags from input.');
  }

  // 3. Neutralize script vectors & dangerous URI schemes
  const dangerousPatterns = [/javascript:/gi, /data:text\/html/gi, /vbscript:/gi, /onload=/gi, /onerror=/gi];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitizedText)) {
      sanitizedText = sanitizedText.replace(pattern, '[BLOCKED_VECTOR]');
      warnings.push('Blocked dangerous script URI or event handler vector.');
    }
  }

  // 4. Prompt Injection Neutralizer (Neutralize systemic instructions trying to exfiltrate private tags)
  const promptInjectionRegex = /(?:ignore\s+previous\s+instructions|system\s+override|reveal\s+all\s+ssn|dump\s+master\s+key|print\s+all\s+confidential)/gi;
  if (promptInjectionRegex.test(sanitizedText)) {
    sanitizedText = sanitizedText.replace(promptInjectionRegex, '[NEUTRALIZED_PROMPT_INJECTION]');
    warnings.push('Neutralized suspicious prompt injection payload.');
  }

  return {
    sanitizedText,
    isSanitized: warnings.length > 0,
    warnings,
  };
}
