# Commitment domain: tasks

Depends on product-foundation 1.3 (test tooling).

- [x] 2.1 Add Zod (pinned) and `lib/domain/schema.ts` with schema tests for each validation rule.
- [x] 2.2 Add `lib/domain/dates.ts` with date-only helpers; tests for same-day display across several timezones.
- [x] 2.3 Add `lib/domain/money.ts`; tests for minor-unit conversion, rounding and `sumByCurrency` with mixed currencies.
- [x] 2.4 Add pure lifecycle functions; tests for complete, restore, archive.
- [x] 2.5 Add `CommitmentRepository` and the localStorage implementation with ownership filtering; tests with a fake storage.
- [x] 2.6 Add `migrate.ts` v0 to v1 with backup and a corrupt-data path; tests with prototype-shaped fixtures.
- [ ] 2.7 Switch the UI to the repository and new model. Implemented in `components/haunt-app.tsx` (no separate `use-commitments` hook yet); typecheck, lint, tests and build pass; NOT yet verified in a browser.
- [ ] 2.8 Per-currency summary. Implemented for the 7-day card using `sumByCurrency`; the monthly view is not built; not browser-verified.
- [ ] 2.9 Add search, filters and sort to The Archive; tests for the pure functions.
- [x] 2.10 Archive action, an Active/Archived list in The Archive, and Restore are done and browser-verified. Series-aware delete confirmation is covered by the delete message for recurring items; edit scopes remain unbuilt.
- [ ] 2.11 Versioned export (commitments, history, reminders, settings) and delete-all with confirmation are done and browser-verified. Validated import is NOT built, so this task stays open.
- [ ] 2.12 Demo data module and explicit "Load fictional demo data" actions exist and are unit-tested; the buttons are not browser-verified.
