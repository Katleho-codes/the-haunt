# Recurrence engine: tasks

Depends on commitment-domain 2.1 and 2.2.

- [x] 3.1 Add the rule schema and validation with example tests.
- [x] 3.2 Implement daily, weekly and fortnightly generation with example tests.
- [x] 3.3 Implement monthly and quarterly generation from the anchor with month-end clamp; tests for 31st, 30th and February.
- [x] 3.4 Implement yearly generation with leap-year handling; tests for 29 February.
- [x] 3.5 Add property tests for ordering, uniqueness, bounds and idempotency.
- [x] 3.6 Series and occurrence types and `listSeries` (design change: only completed occurrences are stored; upcoming ones are derived, so duplicates cannot occur). Tested for uniqueness.
- [x] 3.7 Add zoned time conversion and DST gap/overlap tests (Africa/Johannesburg, Europe/London, America/New_York). Decide whether Intl is enough.
- [x] 3.8 Implement `completeOccurrence`; test that other occurrences and history are untouched.
- [ ] 3.9 `editSeries` (scope: entire series, future occurrences) is implemented and tested: completed history never changes. Scopes "this occurrence" and "this and future" are NOT implemented and are not offered in the UI.
- [ ] 3.10 Wired into the UI and repository: completing a recurring item records history and advances it; undo from The Crypt. Implemented, NOT verified in a browser.
- [ ] 3.11 The Clocktower shows the next three occurrences (not browser-verified). Pause is not implemented; archive exists in the row menu.
- [x] 3.12 Remove the old `nextOccurrence` helper from `lib/date-utils.ts` once nothing uses it.
