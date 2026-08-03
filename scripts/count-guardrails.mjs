#!/usr/bin/env node
// Prints the number of blocking, line-level guardrails in GUARDRAILS
// (scripts/harness-status.mjs). Referenced by the doc-claim marker on the
// "~N line-level guardrails" line in CLAUDE.md — see scripts/check-doc-claims.mjs.

import { GUARDRAILS } from './harness-status.mjs';

console.log(GUARDRAILS.length);
