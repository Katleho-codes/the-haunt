# Commitment domain: tasks

Depends on product-foundation 1.3 (test tooling).

- [ ] 2.1 Add Zod (pinned) and `lib/domain/schema.ts` with schema tests for each validation rule.
- [ ] 2.2 Add `lib/domain/dates.ts` with date-only helpers; tests for same-day display across several timezones.
- [ ] 2.3 Add `lib/domain/money.ts`; tests for minor-unit conversion, rounding and `sumByCurrency` with mixed currencies.
- [ ] 2.4 Add pure lifecycle functions; tests for complete, restore, archive.
- [ ] 2.5 Add `CommitmentRepository` and the localStorage implementation with ownership filtering; tests with a fake storage.
- [ ] 2.6 Add `migrate.ts` v0 to v1 with backup and a corrupt-data path; tests with prototype-shaped fixtures.
- [ ] 2.7 Switch `use-commitments` to the repository and new model; confirm the UI still works in a browser.
- [ ] 2.8 Replace the 7-day total with a per-currency monthly summary and label.
- [ ] 2.9 Add search, filters and sort to The Archive; tests for the pure functions.
- [ ] 2.10 Add archive and series-aware delete confirmation to the UI.
- [ ] 2.11 Add versioned export, validated import and delete-all with confirmation.
- [ ] 2.12 Seed fictional demo data from brief section 14 behind an explicit "load demo data" action.
