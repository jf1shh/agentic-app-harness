# Node WebCrypto TypedArray Buffer Normalization

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Node WebCrypto TypedArray Buffer Normalization** `[guardrail: pbkdf2-salt-buffer]`: When deriving WebCrypto keys via `subtle.deriveKey` with `PBKDF2`, passing `saltBytes.buffer` as `salt` fails in Node.js 20 WebCrypto bindings with `TypeError: 'salt' of 'Pbkdf2Params' is not instance of ArrayBuffer`. Pass a fresh `new Uint8Array(saltBytes)` cast as `BufferSource` to guarantee cross-platform compatibility across both browser and Node.js WebCrypto runtimes.
