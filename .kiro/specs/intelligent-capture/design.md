# Intelligent capture: design

## Modules (`lib/capture/`)
- `proposal.ts`: Zod `commitmentProposalSchema`, `CommitmentProposal` type from brief 5.5 plus `parser` and `needsReview`.
- `deterministic-parser.ts`: replaces `lib/capture.ts`. Split into small extractors: `extractAmount`, `extractCurrency`, `extractRecurrence`, `extractDate`, `classify`. Each returns a value or `undefined`, never a guess.
- `provider.ts`: `ExtractionProvider` interface `{ extract(text, ctx): Promise<unknown> }`. Output is untrusted and passes through `commitmentProposalSchema`.
- `capture-service.ts`: orchestrates provider then fallback; returns a proposal plus a status message for the UI.

## Parser fixes carried from the audit
- Amount requires a currency marker with a word boundary (`R`, `ZAR`, `$`, `USD`, `€`, `£`).
- No clamp of day-of-month. Output `dayOfMonth` and let the recurrence engine apply its documented policy.
- "the 25th" without "monthly" is captured as `dayOfMonth` with a review note, not ignored.
- Dates are `YYYY-MM-DD` computed against the user's timezone, not the browser default.

## UI
Review panel shows each field, a text tag "Check this" for fields in `needsReview`, and a banner "Read by the built-in rule-based reader (not AI)". The banner text derives from `parser`.

## Phase B notes
Server route (Next route handler) calls the provider with a timeout and a size limit on input. No client-side secrets. Not started until the owner approves a provider and consent copy.
