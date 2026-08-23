# A Binary Attachment Must Not Share a Storage Budget With the Record It Annotates

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Binary Attachment Must Not Share a Storage Budget With the Record It Annotates**: Adding
  photos to `projects/elder-care-planner`'s facility shortlist looked like three lines beside the
  existing `localStorage` write, and that version would have destroyed data. `localStorage` is
  ~5MB **per origin**, so the plan and the images compete for one budget: a single phone photo,
  base64-encoded, is 4–5MB on its own, and the `QuotaExceededError` it raises lands on the *plan*
  write. A family loses thirty ledger entries because they attached a picture of a dining room,
  and nothing on screen connects the two events. The rule is structural, not a size limit — put
  binaries in **IndexedDB, in a store the document does not share**, keep only ids in the
  document, and downscale before storing (longest edge ≤1280px, JPEG q0.7) so the cap is generous
  rather than theoretical. Two consequences worth knowing. (1) *A separate store needs a separate
  erase*: "forget everything on this device" cleared `localStorage` and silently left the images
  behind, which on a shared computer is precisely the promise being broken. (2) *Prove the
  isolation by measuring the payload, not by reading the code* — the E2E spec records
  `localStorage.length` before and after attaching, asserts it grew by less than 200 bytes, and
  then reloads to confirm the image is still there; mutation-verified by lengthening the stored id,
  which fails exactly that assertion. Both writes are debounced, so the before/after readings must
  poll for the write to land rather than sampling straight after typing. Not tagged as a
  guardrail: "does this blob share a quota with that document" is a cross-module property, and the
  `setItem` call that eventually fails is nowhere near the code that attached the file.
