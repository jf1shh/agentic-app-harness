import { describe, it, expect } from 'vitest';
import { detectAndRedactPII, togglePIIMask } from './piiRedactor';

// detectAndRedactPII is the module that decides which sensitive numbers leave
// the browser un-redacted. src/lib/unit.test.ts already proves the labelled,
// colon-delimited happy path ("Routing Number 121000358"); these cases push on
// the edges that a real legal/financial document actually contains: numbers
// described in prose rather than a form field, numbers that repeat, and
// numbers that merely look like the pattern but fall outside its boundary.

describe('detectAndRedactPII', () => {
  describe('bank/routing numbers phrased in prose (new coverage)', () => {
    // RED: a real document rarely says "Account Number: 84729104822" the way
    // the existing fixture does — it says "the account number is 84729104822".
    // The bank regex requires the digits to sit immediately after the label
    // (only whitespace/colon/# between), so the word "is" breaks the match
    // and the number is never detected or redacted at all.
    it('Given a bank account number introduced with "is" rather than a colon, When PII redaction runs, Then the number is still detected and masked', () => {
      const rawText = 'Please wire the funds; the account number is 84729104822 at the receiving bank.';
      const result = detectAndRedactPII(rawText);

      const bankTag = result.tags.find((t) => t.type === 'BANK_ACCOUNT');
      expect(bankTag).toBeDefined();
      expect(bankTag?.originalText).toContain('84729104822');
      expect(result.redactedText).not.toContain('84729104822');
    });

    it('Given a routing number introduced with "is", When PII redaction runs, Then the number is still detected and masked', () => {
      const rawText = 'Routing number is 121000358 for the escrow account.';
      const result = detectAndRedactPII(rawText);

      const bankTag = result.tags.find((t) => t.type === 'BANK_ACCOUNT');
      expect(bankTag).toBeDefined();
      expect(result.redactedText).not.toContain('121000358');
    });

    // Locks that the fix above doesn't loosen the pattern past reason: an
    // unrelated number nearby the word "account" (but not directly labelling
    // it) must not be swept up.
    it('Given the word "account" appears without an adjacent number, When PII redaction runs, Then nothing is falsely redacted', () => {
      const rawText = 'The account was reviewed on 2024-01-15 by the compliance team.';
      const result = detectAndRedactPII(rawText);

      expect(result.tags.some((t) => t.type === 'BANK_ACCOUNT')).toBe(false);
    });
  });

  describe('duplicate values', () => {
    // Backfilled (.agents/AGENTS.md §5.4): detectAndRedactPII already handles
    // this correctly — the final replace loop runs once per tag against the
    // progressively-mutated string, so a repeated value is masked in order
    // rather than the second occurrence being left in the clear or the first
    // occurrence's placeholder being duplicated. Proved by mutation: see PR
    // body for the mutation applied (`.replace` -> a single global replace
    // keyed off the first tag only) and the assertion it broke.
    it('Given the same SSN appearing twice in the text, When PII redaction runs, Then each occurrence gets its own distinct placeholder', () => {
      const rawText = 'Borrower SSN: 453-92-1084. Guarantor SSN: 453-92-1084.';
      const result = detectAndRedactPII(rawText);

      const ssnTags = result.tags.filter((t) => t.type === 'SSN');
      expect(ssnTags).toHaveLength(2);
      expect(result.redactedText).toContain('[REDACTED_SSN_1]');
      expect(result.redactedText).toContain('[REDACTED_SSN_2]');
      expect(result.redactedText).not.toContain('453-92-1084');
    });
  });

  describe('negative path', () => {
    it('Given text with no PII of any kind, When PII redaction runs, Then nothing is flagged and the text is returned unchanged', () => {
      const rawText = 'The consolidated leverage ratio covenant requires a maximum of 3.25x EBITDA.';
      const result = detectAndRedactPII(rawText);

      expect(result.piiCount).toBe(0);
      expect(result.tags).toHaveLength(0);
      expect(result.redactedText).toBe(rawText);
    });
  });

  describe('SSN pattern boundary', () => {
    // Backfilled: the \b word boundary in ssnRegex should reject a 9-2-4-digit
    // run that merely contains a valid SSN shape as a substring, since that is
    // not a real SSN — it is a longer number that happens to overlap the
    // pattern. Proved by mutation: dropping the leading \b from the regex
    // makes this assertion fail (the longer run then matches).
    it('Given a longer digit run that contains an SSN-shaped substring, When PII redaction runs, Then the longer run is not treated as an SSN', () => {
      const rawText = 'Reference code 9453-92-1084 does not correspond to any individual.';
      const result = detectAndRedactPII(rawText);

      expect(result.tags.some((t) => t.type === 'SSN')).toBe(false);
    });
  });
});

describe('togglePIIMask', () => {
  it('Given two distinct redacted tags, When only one is unmasked, Then the other stays hidden', () => {
    const rawText = 'SSN: 453-92-1084. Contact: jane.doe@lexivault-client.example.';
    const result = detectAndRedactPII(rawText);
    const ssnTag = result.tags.find((t) => t.type === 'SSN')!;
    const emailTag = result.tags.find((t) => t.type === 'EMAIL')!;

    const partiallyUnmasked = togglePIIMask(result.redactedText, result.tags, new Set([ssnTag.id]));

    expect(partiallyUnmasked).toContain('453-92-1084');
    expect(partiallyUnmasked).toContain(emailTag.redactedPlaceholder);
    expect(partiallyUnmasked).not.toContain('jane.doe@lexivault-client.example');
  });
});
