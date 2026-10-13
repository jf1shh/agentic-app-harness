/**
 * Universal XSS & Input Sanitizer Utility
 * Strips dangerous HTML tags, inline event handlers (onerror, onload), and script protocols cleanly without ReDoS.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // Strip script blocks and inline handlers repeatedly until nothing changes, so a payload that only
  // forms a tag or handler after one removal pass (e.g. "<scr<script></script>ipt>") cannot survive.
  let output = input;
  let previous: string;
  do {
    previous = output;
    output = output
      // Script blocks, including closing tags with whitespace/attributes such as "</script >"
      .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, '')
      // Unterminated opening script tags
      .replace(/<script\b[^>]*>?/gi, '')
      // Inline event handlers (e.g. onerror=, onload=, onclick=)
      .replace(/\s*on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  } while (output !== previous);

  return output
    // Neutralize javascript: protocols
    .replace(/javascript\s*:/gi, 'no-javascript:')
    // Encode every remaining angle bracket, so no markup can survive in any form
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
