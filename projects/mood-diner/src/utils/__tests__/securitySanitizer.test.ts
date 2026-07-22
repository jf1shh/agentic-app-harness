import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeObject } from '../securitySanitizer';

describe('Security Input Sanitizer Suite', () => {
  it('strips script tags and neutralizes javascript: protocols', () => {
    const maliciousInput = '<script>alert("XSS")</script>Delicious Bistro';
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('Delicious Bistro');
  });

  it('neutralizes inline event handlers like onerror and onload', () => {
    const maliciousImage = '<img src="x" onerror="alert(1)" />';
    const sanitized = sanitizeInput(maliciousImage);

    expect(sanitized).not.toContain('onerror');
    expect(sanitized).toContain('&lt;img');
  });

  it('recursively sanitizes nested objects', () => {
    const maliciousPayload = {
      name: '<script>doBadThing()</script>Gary Danko',
      address: '800 North Point St',
      tags: ['<img src=x onerror=alert(1)>', 'Romantic'],
    };

    const sanitized = sanitizeObject(maliciousPayload);

    expect(sanitized.name).not.toContain('<script>');
    expect(sanitized.tags[0]).not.toContain('onerror');
    expect(sanitized.tags[1]).toBe('Romantic');
  });
});
