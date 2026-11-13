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
- [ ] 2.10 Archive action added to the row menu (not browser-verified); series-aware delete waits for the recurrence engine.
- [ ] 2.11 Versioned export and delete-all with confirmation are implemented (not browser-verified). Validated import is not built.
- [ ] 2.12 Demo data module and explicit "Load fictional demo data" actions exist and are unit-tested; the buttons are not browser-verified.
