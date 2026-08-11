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

describe('detectAndRedactPII — tax ID / EIN (previously zero coverage)', () => {
  // Mutation testing (node scripts/run-mutation.mjs legal-financial-rag) found
  // this file at 66% with 27 survived mutants. The single biggest gap: no test
  // anywhere in this suite ever exercised the EIN/TAX_ID branch (the einRegex
  // block and its `type: 'TAX_ID'` tag) at all — every mutant in that whole
  // branch survived by default, because nothing ran the code path.
  it('Given an EIN formatted as XX-XXXXXXX, When PII redaction runs, Then it is tagged as TAX_ID and redacted', () => {
    const rawText = 'Employer Identification Number: 47-1234567 on the W-9.';
    const result = detectAndRedactPII(rawText);

    const taxTag = result.tags.find((t) => t.type === 'TAX_ID');
    expect(taxTag).toBeDefined();
    expect(taxTag?.originalText).toBe('47-1234567');
    expect(taxTag?.redactedPlaceholder).toBe('[REDACTED_TAX_ID_1]');
    expect(result.redactedText).toContain('[REDACTED_TAX_ID_1]');
    expect(result.redactedText).not.toContain('47-1234567');
  });

  it('Given two different EINs in the text, When PII redaction runs, Then each gets its own distinct, incrementing placeholder', () => {
    const rawText = 'Borrower EIN 12-3456789; guarantor EIN 98-7654321.';
    const result = detectAndRedactPII(rawText);

    const taxTags = result.tags.filter((t) => t.type === 'TAX_ID');
    expect(taxTags).toHaveLength(2);
    expect(result.redactedText).toContain('[REDACTED_TAX_ID_1]');
    expect(result.redactedText).toContain('[REDACTED_TAX_ID_2]');
    expect(result.redactedText).not.toContain('12-3456789');
    expect(result.redactedText).not.toContain('98-7654321');
  });
});

describe('detectAndRedactPII — tag field correctness', () => {
  // Nothing in this suite ever asserted on tag.id, tag.startIndex, tag.endIndex
  // or tag.isMasked — every mutant touching those fields survived regardless of
  // which type's branch produced them.
  it('Given a single SSN, When PII redaction runs, Then the tag carries the correct id, position and mask flag', () => {
    const rawText = 'SSN on file: 453-92-1084.';
    const result = detectAndRedactPII(rawText);

    const ssnTag = result.tags.find((t) => t.type === 'SSN')!;
    expect(ssnTag.id).toBe('tag-ssn-1');
    expect(ssnTag.isMasked).toBe(true);
    expect(ssnTag.startIndex).toBe(rawText.indexOf('453-92-1084'));
    expect(ssnTag.endIndex).toBe(rawText.indexOf('453-92-1084') + '453-92-1084'.length);
  });
});

describe('detectAndRedactPII — bank/routing duplicates and IBAN', () => {
  it('Given two different bank account numbers in the text, When PII redaction runs, Then each gets its own distinct, incrementing placeholder', () => {
    const rawText = 'Wire to Account Number: 84729104822. Backup: Account Number: 55566677788.';
    const result = detectAndRedactPII(rawText);

    const bankTags = result.tags.filter((t) => t.type === 'BANK_ACCOUNT');
    expect(bankTags).toHaveLength(2);
    expect(result.redactedText).toContain('[REDACTED_BANK_ACCT_1]');
    expect(result.redactedText).toContain('[REDACTED_BANK_ACCT_2]');
  });

  // The bank regex alternation is `Routing|Account|IBAN` — every existing case
  // used "Account" or "Routing", so the IBAN branch of the alternation had no
  // case of its own. Note: the regex caps the captured value at 18 characters
  // ({8,18}), so a real full-length IBAN (15-34 chars per ISO 13616) is too
  // long to match at all — a separate, genuine gap this test doesn't paper
  // over by using a value short enough to fit the existing cap.
  it('Given a bank code labelled with the word "IBAN", When PII redaction runs, Then it is detected and masked', () => {
    const rawText = 'IBAN: NWBK60161331 for the wire transfer.';
    const result = detectAndRedactPII(rawText);

    const bankTag = result.tags.find((t) => t.type === 'BANK_ACCOUNT');
    expect(bankTag).toBeDefined();
    expect(result.redactedText).not.toContain('NWBK60161331');
  });
});

describe('detectAndRedactPII — duplicate email addresses', () => {
  it('Given the same email address appearing twice, When PII redaction runs, Then each occurrence gets its own distinct placeholder', () => {
    const rawText = 'Primary: jane.doe@lexivault-client.example. CC: jane.doe@lexivault-client.example.';
    const result = detectAndRedactPII(rawText);

    const emailTags = result.tags.filter((t) => t.type === 'EMAIL');
    expect(emailTags).toHaveLength(2);
    expect(result.redactedText).toContain('[REDACTED_EMAIL_1]');
    expect(result.redactedText).toContain('[REDACTED_EMAIL_2]');
    expect(result.redactedText).not.toContain('jane.doe@lexivault-client.example');
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
