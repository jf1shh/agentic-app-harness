/**
 * Universal XSS & Input Sanitizer Utility
 * Strips dangerous HTML tags, inline event handlers (onerror, onload), and script protocols cleanly without ReDoS.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return stripScriptBlocks(input)
    // Neutralize inline event handlers (onerror=, onload=, ...) by renaming them; the replacement
    // cannot re-form a handler, so one pass is complete.
    .replace(/on([a-z]+)\s*=/gi, 'data-blocked-$1=')
    // Neutralize javascript: protocols
    .replace(/javascript\s*:/gi, 'no-javascript:')
    // Encode every remaining angle bracket, so no markup can survive in any form
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Removes <script ...>...</script ...> blocks (and an unterminated trailing <script ...>), case-insensitively,
 * rescanning from the start after every removal so a block that only forms once another is removed
 * (e.g. "<scr<script></script>ipt>") is removed too.
 */
function stripScriptBlocks(input: string): string {
  let output = input;
  for (;;) {
    const lower = output.toLowerCase();
    const start = lower.indexOf('<script');
    if (start === -1) return output;
    const close = lower.indexOf('</script', start + 7);
    let end = output.length;
    if (close !== -1) {
      const gt = lower.indexOf('>', close);
      end = gt === -1 ? output.length : gt + 1;
    }
    output = output.slice(0, start) + output.slice(end);
  }
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
