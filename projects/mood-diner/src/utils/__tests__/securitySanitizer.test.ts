import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeObject } from '../securitySanitizer';

describe('Security Input Sanitizer Suite', () => {
  it('Given input carrying a script tag, When it is sanitized, Then the script is stripped and the legitimate text survives', () => {
    const maliciousInput = '<script>alert("XSS")</script>Delicious Bistro';
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('Delicious Bistro');
  });

  it('Given an img tag with an inline onerror handler, When it is sanitized, Then the handler is removed and the markup is escaped', () => {
    const maliciousImage = '<img src="x" onerror="alert(1)" />';
    const sanitized = sanitizeInput(maliciousImage);

    expect(sanitized).not.toContain('onerror');
    expect(sanitized).toContain('&lt;img');
  });

  it('Given a nested payload with malicious values in fields and arrays, When the object is sanitized, Then every level is cleaned', () => {
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
