/**
 * Returns the URL only if it is an absolute http(s) URL; otherwise '#'.
 * Restaurant records are validated on load (src/lib/schemas.ts), but links are also
 * checked where they are rendered so a `javascript:` or `data:` URL can never reach an href.
 */
export function safeHttpUrl(url: unknown): string {
  if (typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '#';
  } catch {
    return '#';
  }
}
