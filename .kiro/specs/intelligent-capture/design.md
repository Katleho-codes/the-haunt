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

## Implemented design (13 November 2026, Phase A only)
- `lib/capture/proposal.ts`: Zod `commitmentProposalSchema` and `reviewNotes`. `needsReview` entries are written "field: note". A missing due date must be listed there.
- `lib/capture/extract.ts`: extractors for amounts (currency marker required), recurrence, dates, type and title. `lib/capture/deterministic-parser.ts` composes them with an injected clock and timezone, and validates its own output.
- `lib/capture/review.ts`: turns a proposal into the editable form. Repeat patterns the form cannot express (daily, weekday lists, unusual intervals) are reported in the review notes instead of being dropped silently.
- The note is shown during review (`sourceSummary`) but is not copied into the saved Details, so it cannot go stale.
- Values the reader had to work out (for example "the 25th every month" to the next 25th) are flagged "Check this". Editing a flagged field clears its marker.
- Phase B (LLM adapter, consent, server route) and Phase C (files, OCR, voice) are not started. No capture code calls any network service.
