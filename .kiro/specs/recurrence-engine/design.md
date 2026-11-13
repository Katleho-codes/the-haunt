# Recurrence engine: design

## Modules
- `lib/recurrence/rule.ts`: `RecurrenceRule` schema and validation.
- `lib/recurrence/generate.ts`: `generateOccurrences(rule, startDate, window): DateOnly[]`. Pure and deterministic.
- `lib/recurrence/series.ts`: `Series`, `Occurrence`, `mergeOccurrences(existing, generated)`, `completeOccurrence`, `applyEdit(series, scope, patch)`.
- `lib/recurrence/zoned.ts`: converts `(DateOnly, LocalTime, timezone)` to a UTC instant using `Intl.DateTimeFormat` and the DST rules above. No new dependency unless Intl proves insufficient; decide in task 3.7.

## Algorithm
Occurrence n is computed from the rule's anchor (start date and original day-of-month), not from the previous occurrence. This avoids drift after month-end clamping (31 Jan, 28/29 Feb, 31 Mar).

## Occurrence identity
`occurrenceId = seriesId + ":" + dueDate`. Merge keys on that id, which makes regeneration idempotent.

## Edit scopes
Supported first: "this occurrence" and "entire series (future occurrences only)". "This and future" splits a series into two with a new `seriesId` from the split date. Anything not yet implemented is hidden in the UI.

## Property tests (fast-check)
- strictly increasing and unique;
- within start and end bounds;
- idempotent merge;
- monthly day-of-month never exceeds the anchor day and equals `min(anchor, daysInMonth)`;
- yearly 29 Feb behaviour across leap and non-leap years;
- DST: round-trip from local time to UTC instant keeps the local date.

## Implemented design (13 November 2026)
- Only **completed** occurrences are stored (Occurrence: id, userId, commitmentId, dueDate, completedAt). The commitment is the series master and its dueDate is the current occurrence. Upcoming dates are derived from the rule, so regeneration cannot duplicate anything.
- `recurrence.startDate` is the anchor; rules saved without one fall back to the current due date.
- Completing the current occurrence stores a history record and moves `dueDate` to the next date. At the end date the commitment becomes completed.
- Undo is allowed for the most recent completion only; older history is never rewritten.
- Editing the due date or pattern re-anchors the series at the new date. History is unaffected.
- DST policy lives in `lib/recurrence/zoned.ts`; it is tested but not yet used by reminders (a date-only due date has no time).
