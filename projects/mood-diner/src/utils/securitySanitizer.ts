/**
 * Universal XSS & Input Sanitizer Utility
 * Strips dangerous HTML tags, inline event handlers (onerror, onload), and script protocols cleanly without ReDoS.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove script tags cleanly without unsafe regex back-tracking
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    // Remove inline event handlers (e.g. onerror=, onload=, onclick=)
    .replace(/\s*on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Neutralize javascript: protocols
    .replace(/javascript\s*:/gi, 'no-javascript:')
    // Encode HTML entities for safe rendering
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => (typeof item === 'string' ? sanitizeInput(item) : item));
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
