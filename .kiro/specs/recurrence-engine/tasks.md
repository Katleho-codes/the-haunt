# Recurrence engine: tasks

Depends on commitment-domain 2.1 and 2.2.

- [ ] 3.1 Add the rule schema and validation with example tests.
- [ ] 3.2 Implement daily, weekly and fortnightly generation with example tests.
- [ ] 3.3 Implement monthly and quarterly generation from the anchor with month-end clamp; tests for 31st, 30th and February.
- [ ] 3.4 Implement yearly generation with leap-year handling; tests for 29 February.
- [ ] 3.5 Add property tests for ordering, uniqueness, bounds and idempotency.
- [ ] 3.6 Add series and occurrence types, `mergeOccurrences`, and tests for duplicates.
- [ ] 3.7 Add zoned time conversion and DST gap/overlap tests (Africa/Johannesburg, Europe/London, America/New_York). Decide whether Intl is enough.
- [ ] 3.8 Implement `completeOccurrence`; test that other occurrences and history are untouched.
- [ ] 3.9 Implement edit scopes "this occurrence" and "entire series"; test that completed occurrences never change.
- [ ] 3.10 Wire the engine into the repository and The Hall so completing a recurring item advances it.
- [ ] 3.11 Rebuild The Clocktower from series data with next three occurrences, pause and archive.
- [ ] 3.12 Remove the old `nextOccurrence` helper from `lib/date-utils.ts` once nothing uses it.
