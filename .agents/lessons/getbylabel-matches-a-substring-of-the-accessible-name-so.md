# `getByLabel` Matches a Substring of the Accessible Name, So One Label Can Resolve to Two Controls

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **`getByLabel` Matches a Substring of the Accessible Name, So One Label Can Resolve to Two
  Controls**: A per-dimension score `<select>` labelled "Food at Oakmont" sat beside its own note
  field labelled "Note about food at Oakmont", and `getByLabel('Food at Oakmont')` matched both —
  twelve specs failed at once on a strict-mode violation that reads like a duplicated element
  rather than a naming collision. `exact: true` does not rescue it either, because these labels
  carry a hint `<span>` that is part of the accessible name. Locate by **role plus name**
  (`getByRole('combobox', { name })`) whenever two controls in one card describe the same subject;
  it disambiguates on the thing that actually differs, and it fails loudly if the control's role
  changes. This is a sharper form of the existing strict-mode lesson: scoping to a container was
  already being done here and was not enough. Not tagged as a guardrail: whether one label is a
  substring of another is a property of two separate JSX nodes.
