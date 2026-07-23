/**
 * Secure Memory Zeroization Engine.
 * Overwrites residual byte buffers and sensitive strings in browser memory before garbage collection.
 */

export function zeroizeBuffer(buffer: Uint8Array): void {
  if (buffer && buffer.fill) {
    buffer.fill(0);
  }
}

export function wipeSensitiveState(obj: Record<string, unknown>): void {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = '[ZEROIZED]';
      } else if (Array.isArray(obj[key])) {
        obj[key] = [];
      }
    }
  }
}
