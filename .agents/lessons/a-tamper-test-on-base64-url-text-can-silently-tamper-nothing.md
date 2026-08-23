# A Tamper Test on Base64(url) Text Can Silently Tamper Nothing

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Tamper Test on Base64(url) Text Can Silently Tamper Nothing**: The shared-link decoder's
  tamper-detection test (`share.test.ts`) originally flipped the last character of the ciphertext
  segment and asserted decoding failed. It passed — and would have kept passing even if AES-GCM's
  authentication had been silently disabled, because base64 packs 6-bit groups into the encoding
  and a byte length that is not a multiple of 3 leaves the final character's low bits as padding
  that never maps to a real byte. Flipping exactly those bits re-encodes to a different string that
  decodes to the *identical* bytes, so "the fragment changed" and "the ciphertext changed" are not
  the same claim, and a test that only checks the former can be vacuous without ever failing loudly
  enough to notice. Caught only because the mutation-proof step (§9.4) mutated something unrelated
  (fixed salt/IV instead of random) and the tamper test *should* have still failed on that run but
  didn't — a mutation-proof step earns its keep by catching a defect in the test itself, not only in
  the code under test. The fix is to tamper at the byte level — decode to bytes, flip one in the
  middle, re-encode — which cannot land on a padding-only bit regardless of length. The same freshness
  test had a second, independent confound: two calls to the encoder produced different ciphertexts
  even with identical salt and IV, because a `createdAt` timestamp embedded in the plaintext differed
  by a few milliseconds between calls, so the test could not actually isolate what it claimed to
  test. Freezing the clock (`vi.setSystemTime`) before both calls removed that confound and let the
  salt/IV mutation prove the test could fail for the right reason. General shape: when a test's pass
  condition is "these two encoded outputs differ" or "this edited input now fails," check that the
  edit or the inputs cannot differ for a reason unrelated to the property under test — the last
  character of an encoding and a wall-clock timestamp are two ways that happens, and neither is
  obvious from reading the assertion alone.
