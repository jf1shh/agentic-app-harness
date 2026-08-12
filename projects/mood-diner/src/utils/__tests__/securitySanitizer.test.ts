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

  // Mutation testing (node scripts/run-mutation.mjs mood-diner --mutate
  // "src/utils/securitySanitizer.ts") found the empty/non-string early
  // return and sanitizeObject's nested-object recursion both NoCoverage.

  it('Given an empty string, When sanitized, Then it returns an empty string rather than throwing', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('Given a javascript: protocol with no surrounding tag, When sanitized, Then it is neutralized', () => {
    expect(sanitizeInput('javascript:alert(1)')).toContain('no-javascript:');
  });

  it('Given text containing a literal ">" with no tag around it, When sanitized, Then it is HTML-entity encoded', () => {
    expect(sanitizeInput('5 > 3')).toBe('5 &gt; 3');
  });

  it('Given a payload with a nested object value (not just a string or array), When sanitized, Then the nested object is recursively cleaned too', () => {
    const payload = {
      name: 'Gary Danko',
      location: { address: '<script>steal()</script>800 North Point St' },
    };
    const sanitized = sanitizeObject(payload);
    expect((sanitized.location as { address: string }).address).not.toContain('<script>');
    expect((sanitized.location as { address: string }).address).toContain('800 North Point St');
  });

  it('Given a payload with a non-string, non-array, non-object value, When sanitized, Then it passes through unchanged', () => {
    const payload = { name: 'Gary Danko', rating: 4.8, isOpen: true, closedUntil: null };
    const sanitized = sanitizeObject(payload);
    expect(sanitized.rating).toBe(4.8);
    expect(sanitized.isOpen).toBe(true);
    expect(sanitized.closedUntil).toBeNull();
  });
});
