# Intelligent capture: tasks

Depends on commitment-domain 2.1 to 2.3.

## Phase A: deterministic
- [x] Prototype deterministic parser exists in `lib/capture.ts` (4 passing tests; known defects in `docs/IMPLEMENTATION-AUDIT.md`).
- [x] Prototype review step exists and labels the parser as not AI.
- [x] 5.1 Add `CommitmentProposal` Zod schema and tests for valid, missing and malformed input.
- [x] 5.2 Write regression tests for the audit defects: "for 3 weeks" gives no amount; "31st every month" keeps day 31.
- [x] 5.3 Write tests for the two brief examples (fibre bill, vehicle licence in March).
- [x] 5.4 Rebuild extractors as separate functions in `lib/capture/`; keep all tests passing.
- [x] 5.5 Property test: parser never returns an amount without a currency marker in the input.
- [x] 5.6 Make tests independent of the current date (inject `now`).
- [x] 5.7 Update the review panel: field-level "Check this" tags, `needsReview` list, parser banner, disabled save until valid.
- [x] 5.8 Removed the old `lib/capture.ts`; the reader now lives in `lib/capture/`.

## Phase B: LLM adapter (gated on owner approval)
- [ ] 5.9 NOT STARTED (gated on owner approval). Define `ExtractionProvider` and a fake provider for tests.
- [ ] 5.10 NOT STARTED (gated on owner approval). Add capture service tests for timeout, malformed JSON, rate limit and unavailable provider.
- [ ] 5.11 NOT STARTED (gated on owner approval). Add consent and disclosure UI and stored consent.
- [ ] 5.12 NOT STARTED (gated on owner approval). Add a server route with one real provider; key in server env only.

## Phase C: files and voice (gated, probably out of MVP)
- [ ] 5.13 NOT STARTED (gated on owner approval). Design upload validation, private storage and cleanup; review before any code.
