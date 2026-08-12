#!/usr/bin/env node
// Self-test for the LEARN gate (see harness-learn.mjs header).
//
// harness-learn.mjs enforces that every OTHER guardrail in this repo carries
// a self-test and a documented lesson — and until this file existed, it was
// the one script in scripts/ making that demand without ever having been
// held to it itself. Zero dependencies; run with:
//   node scripts/harness-learn.test.mjs

import {
  extractLearnedLessonsSection,
  parseTaggedLines,
  checkTraceability,
} from './harness-learn.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- extractLearnedLessonsSection -------------------------------------- */

const DOC_WITH_NEXT_SECTION = [
  '## 5. Something Else',
  'irrelevant [guardrail: not-real] example in the wrong section',
  '## 6. Learned Lessons',
  '- Lesson one [guardrail: foo]',
  '- Lesson two',
  '## 7. Next Section',
  'should not appear',
].join('\n');

const section1 = extractLearnedLessonsSection(DOC_WITH_NEXT_SECTION);
ok(section1 !== null, 'finds the "## 6." heading');
ok(section1[0] === '## 6. Learned Lessons', 'section starts at the "## 6." line');
ok(!section1.some((l) => l.includes('not-real')), 'excludes prose before the section');
ok(!section1.some((l) => l.includes('should not appear')), 'excludes content after the next "##" heading');

const DOC_LAST_SECTION = ['## 6. Learned Lessons', '- Only lesson [guardrail: bar]'].join('\n');
const section2 = extractLearnedLessonsSection(DOC_LAST_SECTION);
ok(section2 !== null && section2.length === 2, 'runs to the end of the doc when "## 6." is the last section');

const DOC_NO_SECTION = ['## 5. Something Else', 'no learned lessons heading here'].join('\n');
ok(extractLearnedLessonsSection(DOC_NO_SECTION) === null, 'returns null when the "## 6." heading is missing');

/* ---- parseTaggedLines -------------------------------------------------- */

const tagged = parseTaggedLines([
  '- First lesson, tagged. [guardrail: explicit-any]',
  '- Second lesson, untagged.',
  '- Third lesson [guardrail: viewport-no-zoom] with more text after.',
]);
ok(tagged.size === 2, 'parseTaggedLines finds exactly the tagged lines');
ok(tagged.get('explicit-any')?.includes('First lesson'), 'maps a tag id to its own line text');
ok(tagged.get('viewport-no-zoom')?.includes('Third lesson'), 'maps a second tag id to its own line');
ok(!tagged.has('second'), 'an untagged lesson line is not present in the map');

const caseInsensitive = parseTaggedLines(['- Tagged in caps. [GUARDRAIL: My-Id]']);
ok(caseInsensitive.has('My-Id'), 'the tag marker itself is matched case-insensitively');

/* ---- checkTraceability -------------------------------------------------- */

const GOOD_GUARDRAIL = { id: 'explicit-any', lesson: 'Strict TypeScript in Harness' };
const goodTagged = parseTaggedLines(['- Strict TypeScript in Harness [guardrail: explicit-any]']);
ok(
  checkTraceability([GOOD_GUARDRAIL], goodTagged).length === 0,
  'a guardrail with a lesson, a matching tag, on the right bullet produces no errors',
);

const NO_LESSON = { id: 'no-lesson-rule', lesson: '' };
const errorsNoLesson = checkTraceability([NO_LESSON], new Map());
ok(
  errorsNoLesson.some((e) => e.includes('no-lesson-rule') && e.includes('no')),
  'a guardrail with an empty lesson back-reference is flagged',
);

const UNTAGGED = { id: 'untagged-rule', lesson: 'Some Lesson Title' };
const errorsUntagged = checkTraceability([UNTAGGED], new Map());
ok(
  errorsUntagged.some((e) => e.includes('untagged-rule') && e.includes('not tagged')),
  'a guardrail with a lesson but no matching tag in AGENTS.md is flagged',
);

const RENAMED = { id: 'renamed-rule', lesson: 'The New Lesson Title' };
const staleTagged = parseTaggedLines(['- The OLD lesson title [guardrail: renamed-rule]']);
ok(
  checkTraceability([RENAMED], staleTagged).some((e) => e.includes('renamed-rule') && e.includes('different bullet')),
  'a tag that sits on a bullet not containing the declared lesson text is flagged (rename protection)',
);

const danglingTagged = parseTaggedLines(['- A tag with no guardrail behind it [guardrail: ghost-rule]']);
ok(
  checkTraceability([], danglingTagged).some((e) => e.includes('ghost-rule') && e.includes('no such guardrail')),
  'an AGENTS.md tag with no matching guardrail is flagged as dangling',
);

console.log(failures === 0 ? '\nAll harness-learn self-tests passed.' : `\n${failures} harness-learn self-test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
