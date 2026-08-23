# One Fact Stated Twice Will Eventually Be Stated Two Ways

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **One Fact Stated Twice Will Eventually Be Stated Two Ways**: `elder-care-planner`'s break-even
  card rendered the same crossover three times — a summary paragraph, a slider status line, and
  (later) a headline sentence. The summary computed its own figure from `BreakEvenResult` and said
  *"the two options cost the same at 38.5 hours a week"*; the other two read the §11.10 band and
  said *"between 34.2 and 45.6 hours a week"*. A point estimate where §1.1 requires a range, sitting
  directly above two correct statements, and it was the most prominent of the three. Nobody wrote
  the contradiction deliberately: the band was resolved inside the slider component, so the panel
  literally could not reach it and computed the only thing it could. **The structural fix is to
  resolve a shared figure once, above every consumer, and pass it down** — here into
  `lib/engine/citedBreakEvenBand.ts`, resolved in the panel and handed to both. Two call sites
  computing "the same" value stay identical only until someone edits one, and the drift shows up as
  two sentences in one card disagreeing in front of the reader. Three practical notes. (1) *Share
  the phrase, not just the number*: both sentences now build from one `crossoverRangeText`, because
  agreeing on 34.2 and then formatting it differently is the same defect wearing a hat. (2) *Assert
  the agreement in E2E by parsing both rendered strings and comparing the captured groups* — a test
  that checks each sentence separately against a regex passes on two sentences that disagree with
  each other. (3) *Watch for the wording regressing on the way through*: the first draft of the
  replacement summary said "the published data" about a band that is `derived`, reintroducing the
  §6 Cite-Confidence laundering in a sentence written to fix a different problem — so there is now
  a test asserting neither sentence ever calls the band published. Not tagged as a guardrail:
  whether two strings in different components describe the same underlying fact is a semantic
  judgement, and the two call sites are usually in different files.
