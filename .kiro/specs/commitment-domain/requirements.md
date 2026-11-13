# Commitment domain: requirements

Supersedes the data parts of `core-experience`. Follows brief section 5.1 and 5.2.

## Goal
A validated, timezone-safe commitment model behind a persistence interface, with ownership as a first-class field.

### Requirement 1: Model and validation
- WHEN a commitment is created or loaded THEN it SHALL pass a runtime schema before use.
- WHEN the title is empty after trimming THEN the system SHALL reject it.
- WHEN `dueDate` is not a real calendar date in `YYYY-MM-DD` form THEN the system SHALL reject it.
- WHEN an amount is present THEN it SHALL be a non-negative integer in minor units and a valid ISO 4217 currency SHALL be present.
- WHEN a due time is absent THEN the due value SHALL be stored as a date-only value with no UTC conversion.

### Requirement 2: Dates
- WHEN a date-only value is formatted in any timezone THEN it SHALL show the same calendar day.
- WHEN "today", "overdue" or "upcoming" is computed THEN it SHALL use the user's stored IANA timezone, not the browser default.

### Requirement 3: Lifecycle
- WHEN a one-off commitment is completed THEN `status` SHALL become completed and `completedAt` SHALL be set in UTC.
- WHEN a completed commitment is restored THEN `status` SHALL be active and `completedAt` SHALL be cleared.
- WHEN a commitment is archived THEN history SHALL be kept and it SHALL leave active views.
- WHEN a commitment is deleted THEN the user SHALL confirm first AND its reminders SHALL be removed.

### Requirement 4: Persistence boundary
- WHEN components read or write commitments THEN they SHALL use a repository interface, not `localStorage` directly.
- WHEN stored data has an older schema version THEN a migration SHALL convert it without losing records.
- WHEN stored data is corrupt THEN the app SHALL keep the raw data aside, tell the user, and SHALL NOT silently replace it with seed data.
- Every repository read and write SHALL take a `userId`, and records of another `userId` SHALL NOT be returned.

### Requirement 5: Search and filter
- WHEN the user searches THEN title and description SHALL be matched case-insensitively.
- WHEN filters for category, status, date range or recurring are applied THEN results SHALL satisfy all of them.
- WHEN a sort is chosen (due date, created, title) THEN order SHALL be deterministic.

### Requirement 6: Money
- WHEN amounts are summarised THEN they SHALL be grouped by currency and never combined across currencies.
- WHEN the summary is displayed THEN it SHALL be labelled as user-entered scheduled amounts.

### Requirement 7: Data export, import and deletion
- WHEN the user exports THEN the file SHALL contain commitments and preferences with a schema version.
- WHEN the user imports a valid export THEN records SHALL be validated and merged only after confirmation.
- WHEN the user deletes all data THEN they SHALL confirm and all local commitment and preference data SHALL be removed.
