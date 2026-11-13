# Recurrence engine: requirements

Follows brief section 5.3. Pure functions in `lib/`, no React.

### Requirement 1: Rule model
- WHEN a rule is created THEN it SHALL have a frequency of daily, weekly, monthly, quarterly or yearly, an interval from 1 to 99, and a start date.
- WHEN a rule is weekly THEN it MAY list weekdays 0 to 6.
- WHEN a rule is invalid THEN validation SHALL reject it with a reason.
- The UI SHALL only offer frequencies that are implemented and tested.

### Requirement 2: Calendar arithmetic
- WHEN occurrences are generated THEN date arithmetic SHALL be calendar-based and SHALL NOT add fixed milliseconds.
- WHEN a monthly or yearly rule targets a day that does not exist in a month THEN the occurrence SHALL fall on the last day of that month (documented clamp policy) AND the rule's original day SHALL be kept for later months.
- WHEN a yearly rule starts on 29 February THEN non-leap years SHALL use 28 February and leap years SHALL use 29 February.
- WHEN an occurrence has a due time and the local time does not exist (DST gap) THEN it SHALL move forward to the next valid minute; WHEN it occurs twice (DST overlap) THEN the first instance SHALL be used.

### Requirement 3: Generation invariants
- Occurrences SHALL be strictly increasing and unique.
- No occurrence SHALL precede the start date or follow the end date.
- WHEN generation is run twice for the same window THEN the result SHALL be identical (idempotent), and merging into stored occurrences SHALL create no duplicates.

### Requirement 4: Series and occurrences
- WHEN a recurring commitment is saved THEN a series (master rule) SHALL exist and occurrences SHALL be generated for a bounded window (for example the next 12 months).
- WHEN one occurrence is completed THEN other occurrences SHALL remain unchanged and the next occurrence SHALL become the current one.
- WHEN a series is edited with scope "this and future" or "entire series" THEN completed occurrences SHALL NOT change.
- WHEN a scope is not supported THEN the UI SHALL say so and SHALL NOT silently apply a different scope.
- WHEN a series is paused or archived THEN no new active occurrences SHALL appear.

### Requirement 5: Display
- WHEN The Clocktower lists a series THEN it SHALL show frequency, next due date, known amount and currency, and the next three occurrences.
