# docker-agent vs current PROPOSE step — trial, 2026-10-12

Trial for GitHub radar item 3 (docker/docker-agent). Not wired into CI or any script.

## Setup
- Sample (non-private: this public repo's own Sense output): `harness-status.json` from
  `node scripts/harness-status.mjs` at master `7797ded250a95ae16024fe0a1752829192f6c633`,
  2026-10-12 09:57 PT; 1 finding, `legal-financial-rag-spec-drift` (drift, medium, gate `manual-review`).
- Current step: `node scripts/emit-tasks.mjs --no-sense` → `sample/baseline-emit-tasks.md`.
- Trial: docker-agent v1.150.0 (standalone `docker-agent-linux-amd64` release binary, sha256
  `791fa6bac9f829847f00ab948f838bf54d11e0830988a5e5bce88d65ea65f2d1`), `propose.yaml` in this folder,
  `TELEMETRY_ENABLED=false`, model Qwen3-Coder-30B-A3B-Instruct-GGUF on the PC's Lemonade server
  (127.0.0.1:13305; nothing left the machine), filesystem toolset read-only →
  `sample/docker-agent-output.md`. Model unloaded after the run.
- Not an MCP-server toolset: docker-agent's built-in filesystem toolset was used (no npx download).

## Result
| | emit-tasks.mjs (current) | docker-agent + local Qwen3-Coder |
|---|---|---|
| Wall time | 0.020 s | 24 s (incl. model load) |
| Deterministic / idempotent | yes; never clobbers an open order | no; output varies per run |
| Contract header ("Auto-generated… do not edit") | present | **missing** |
| Finding fields (id, app, type, severity, gate, spec) | all, spec as link | all, spec as plain path |
| Context | finding detail verbatim | finding detail verbatim + two "Spec reference" quotes |
| Spec actually read? | n/a (links it) | **no** — it searched `specs/` for the finding id ("No results found") and never opened `specs/legal-financial-rag-spec.md`. The quoted text matches spec lines 32 and 37, but it was copied from the finding, not the file, and has no line refs. |
| Definition of done | gate-specific steps incl. "resolve **or explicitly defer**", `--prune`, PR, lesson/guardrail note | dropped the "defer" option; told the agent to implement everything; **"Run the acceptance gate command: `manual-review`" — not a command** |
| Writes tasks/ | yes | no (read-only by design) |

## Verdict (judgment)
Do not replace `emit-tasks.mjs`. On this sample the docker-agent order is a strict downgrade:
slower, non-deterministic, lost the contract header and the defer path, and invented a gate
"command". The only added value (spec quotes) did not come from reading the spec. A possible
later use is an optional *enrichment* pass that appends real spec excerpts (with line numbers) to
an emit-tasks order, with a stronger model and an instruction to open `specRef` first — re-trial
on more than one finding before deciding. Telemetry must stay off (`TELEMETRY_ENABLED=false`);
docker-agent's docs say command telemetry includes positional args, i.e. the prompt.
