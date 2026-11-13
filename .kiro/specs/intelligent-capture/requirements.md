# Intelligent capture: requirements

Follows brief sections 5.5 and 5.6. Refines the earlier prototype spec.

## Scope assumption awaiting owner approval
Phase A is deterministic text capture only, labelled as deterministic and not AI. Phase B (LLM adapter) and Phase C (files, OCR, voice) are optional and gated on owner approval, consent UI and server-side key handling.

### Requirement 1: Proposal contract
- WHEN text is captured THEN the result SHALL be a `CommitmentProposal` validated by a runtime schema, never a persisted commitment.
- WHEN a field cannot be determined THEN it SHALL be absent and its name SHALL appear in `needsReview`.
- The proposal SHALL carry `parser: "deterministic" | "llm"` and the UI SHALL show it.

### Requirement 2: No invented values
- WHEN the text says "expires in March" with no day or year THEN `dueDate` SHALL be absent and `needsReview` SHALL include `dueDate`.
- WHEN the text names a day of month that does not exist in the next month (for example the 31st) THEN the proposal SHALL keep `dayOfMonth: 31` and SHALL NOT change it to another day.
- WHEN a number has no currency symbol or code THEN it SHALL NOT become an amount. "for 3 weeks" SHALL NOT yield an amount.
- WHEN a number has no currency marker THEN it SHALL be ignored, so an amount always carries a stated currency. WHEN the marker is ambiguous (a dollar sign) THEN the assumed currency SHALL be listed in `needsReview`.
- WHEN a monthly bill has a day but no month THEN `needsReview` SHALL include a note to confirm the next due date.

### Requirement 3: Expected parses
- "My fibre bill is R899 and is due on the 25th of every month" SHALL produce title Fibre bill, type bill, `amountMinor` 89900, ZAR, monthly, day 25, and a suggested reminder 3 days before.
- "The vehicle licence expires in March; remind me before it expires" SHALL produce a renewal with no due date and a review note.

### Requirement 4: Review and confirm
- WHEN a proposal is shown THEN every field SHALL be editable and uncertain or missing fields SHALL be visibly marked in text, not only in colour.
- WHEN the user confirms THEN the saved commitment SHALL use the edited values and `sourceType` SHALL be `pasted_text`.
- WHEN the user cancels THEN nothing SHALL be saved.
- The save control SHALL be disabled until required fields are valid.

### Requirement 5: Provider failure (Phase B)
- WHEN a provider times out, rate-limits, is unavailable or returns malformed output THEN the app SHALL fall back to the deterministic parser or manual entry and SHALL say what happened.
- WHEN external processing would send user text to a third party THEN the user SHALL see a disclosure and SHALL consent first, and consent SHALL be revocable.
- API keys SHALL stay server-side.

### Requirement 6: Files (Phase C, gated)
- WHEN a file is chosen THEN only PDF, JPEG, PNG and WebP under a stated maximum size SHALL be accepted, checked by content signature on the server.
- Files SHALL be stored privately, deleted after processing within a stated retention period, and their text SHALL NOT be logged.
- WHEN extraction fails THEN a manual path SHALL remain.
