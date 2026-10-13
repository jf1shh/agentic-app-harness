import { describe, it, expect } from 'vitest';
import { safeHttpUrl } from '../safeUrl';

describe('safeHttpUrl', () => {
  it('Given an https URL, When checked, Then it is returned', () => {
    expect(safeHttpUrl('https://garydanko.com')).toBe('https://garydanko.com/');
  });
  it('Given an http URL, When checked, Then it is returned', () => {
    expect(safeHttpUrl('http://example.com/menu')).toBe('http://example.com/menu');
  });
  it.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', 'not a url', ''])(
    'Given %j, When checked, Then it becomes "#"',
    (input) => {
      expect(safeHttpUrl(input)).toBe('#');
    },
  );
  it('Given a non-string, When checked, Then it becomes "#"', () => {
    expect(safeHttpUrl(undefined)).toBe('#');
  });
});
