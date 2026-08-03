#!/usr/bin/env node
// Self-test for the secret-scanning gate (see check-secrets.mjs header).
//
// Every fake secret below is assembled by string concatenation rather than
// written as one literal token. That is not stylistic: if it were a literal
// contiguous match, this file's own source would trip the very scanner it
// tests the moment a PR touching this file runs the gate on itself — a
// self-referential false positive that would fire forever. Concatenation
// means the *pure function* still receives a realistic, fully-matching
// string, but the *source text on disk* never contains the pattern.
//
// Zero dependencies; run with:
//   node scripts/check-secrets.test.mjs

import {
  findSecrets, redact, isScannable, addedLines, scanFile, SECRET_PATTERNS,
} from './check-secrets.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- findSecrets: one realistic fixture per pattern, all assembled -------- */

const FAKES = {
  'anthropic-api-key': 'sk-ant-' + 'a'.repeat(55),
  'openai-api-key': 'sk-' + 'B'.repeat(45),
  'google-api-key': 'AIza' + '1'.repeat(35),
  'xai-api-key': 'xai-' + 'c'.repeat(45),
  'aws-access-key-id': 'AKIA' + 'Q2W3E4R5T6Y7U8I9',
  'github-token': 'ghp_' + 'd'.repeat(40),
  'slack-token': 'xoxb-' + '1234567890-abcdefghij',
  'private-key-block': '-----BEGIN ' + 'RSA ' + 'PRIVATE KEY-----',
};

ok(
  Object.keys(FAKES).length === SECRET_PATTERNS.length,
  'the fixture set covers every pattern id defined in SECRET_PATTERNS (no pattern silently untested)',
);

for (const [id, fake] of Object.entries(FAKES)) {
  const found = findSecrets(`const leaked = "${fake}"; // oops`);
  ok(
    found.some((f) => f.id === id),
    `findSecrets detects a ${id} embedded in a line of realistic surrounding code`,
  );
}

/* ---- findSecrets: must not false-positive on ordinary, secret-shaped text - */

ok(findSecrets('const id = "sk-too-short";').length === 0,
  'findSecrets does not flag a short sk- prefix below the length threshold');
ok(findSecrets('const uuid = "550e8400-e29b-41d4-a716-446655440000";').length === 0,
  'findSecrets does not flag a UUID');
ok(findSecrets('This PR fixes AKIA the login form spacing.').length === 0,
  'findSecrets does not flag "AKIA" appearing as a word fragment, not a full 20-char key');
ok(findSecrets('npm run build && npm test').length === 0,
  'findSecrets is silent on an ordinary line with no secret-shaped substring');

/* ---- redact: never returns the input unchanged, never leaks it whole ------ */

const anthropicFake = FAKES['anthropic-api-key'];
const redacted = redact(anthropicFake);
ok(redacted !== anthropicFake, 'redact never returns the full match verbatim');
ok(!redacted.includes(anthropicFake.slice(10, -10)),
  'redact does not leak the middle of a long secret');
ok(redact('short').length === 'short'.length, 'redact fully masks a short match rather than truncating it oddly');

/* ---- isScannable ------------------------------------------------------------ */

ok(isScannable('src/lib/engine.ts'), 'isScannable accepts a normal source file');
ok(isScannable('.env.example'), 'isScannable accepts a dotfile with no extension match');
ok(!isScannable('public/icons/launcher.png'), 'isScannable rejects a binary image extension');
ok(!isScannable('assets/model.ort'), 'isScannable rejects a binary ONNX-runtime model extension (.ort)');

/* ---- addedLines -------------------------------------------------------------- */

ok(
  JSON.stringify(addedLines('a\nb\nc', 'a\nb\nc\nd')) === JSON.stringify(['d']),
  'addedLines finds exactly the one new line appended to an unchanged file',
);
ok(
  addedLines('a\nb\nc', 'c\nb\na').length === 0,
  'addedLines treats reordered-but-unchanged lines as pre-existing, not newly added',
);
ok(
  JSON.stringify(addedLines('', 'x\ny')) === JSON.stringify(['x', 'y']),
  'addedLines treats every line as added for a brand-new file (empty base)',
);
ok(
  addedLines('a\n\nb', 'a\n\nb\n\n').length === 0,
  'addedLines ignores blank lines entirely (never worth flagging, never worth reporting)',
);

/* ---- scanFile: end-to-end per-file behaviour --------------------------------- */

const introducesSecret = scanFile({
  path: 'src/config.ts',
  baseSource: 'export const A = 1;',
  headSource: `export const A = 1;\nexport const KEY = "${FAKES['openai-api-key']}";`,
});
ok(
  introducesSecret.length === 1 && introducesSecret[0].id === 'openai-api-key'
    && introducesSecret[0].lineNumber === 2,
  'scanFile finds a secret on the specific new line it was added on',
);

const alreadyPresent = scanFile({
  path: 'src/config.ts',
  baseSource: `export const KEY = "${FAKES['openai-api-key']}";`,
  headSource: `export const KEY = "${FAKES['openai-api-key']}";\nexport const B = 2;`,
});
ok(
  alreadyPresent.length === 0,
  'scanFile does not re-flag a secret that already existed at the merge base, only new ones',
);

const binarySkipped = scanFile({
  path: 'public/photo.png',
  baseSource: '',
  headSource: `binary garbage ${FAKES['anthropic-api-key']}`,
});
ok(binarySkipped.length === 0, 'scanFile skips a binary-extension path even if its content would otherwise match');

/* ---- summary ------------------------------------------------------------------ */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
