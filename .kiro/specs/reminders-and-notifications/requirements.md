# Reminders and notifications: requirements

Follows brief section 5.4.

## Scope assumption awaiting owner approval
First release: **in-app reminders only**, computed when the app is open or next opened. There is no background delivery. The UI and README SHALL say this. Browser push is optional (task 4.9) and email is out of scope unless the owner approves a backend.

### Requirement 1: Reminder rules
- WHEN a user sets reminders on a commitment THEN each reminder SHALL be an offset (minutes before the due date/time) with channel `in_app`.
- WHEN the commitment changes (date, time, completion, deletion, archive) THEN its reminders SHALL be recalculated or cancelled.
- WHEN the due date is date-only THEN reminders SHALL fire at a user-configured default time of day.

### Requirement 2: Delivery state
- Each reminder instance SHALL have one of: `scheduled`, `due`, `shown`, `dismissed`, `snoozed`, `cancelled`.
- WHEN a reminder has not been shown to the user THEN the system SHALL NOT mark it shown.
- The system SHALL NOT use the words sent or delivered for in-app reminders.
- WHEN evaluation runs twice for the same instant THEN the same reminder SHALL NOT be created or shown twice (idempotent).

### Requirement 3: Notification centre
- WHEN reminders are due THEN the notification centre SHALL list them with commitment title, due date and state.
- WHEN the user snoozes THEN the reminder SHALL reappear after the chosen duration.
- WHEN the user dismisses THEN it SHALL not reappear.
- WHEN a notification is shown THEN a text label SHALL be visible, independent of sound.

### Requirement 4: Test notification
- WHEN the user presses "Send test reminder" THEN the UI SHALL show the result as a test and SHALL NOT imply a real commitment reminder.

### Requirement 5: Permissions (optional push)
- WHEN browser permission has not been granted THEN no browser notification SHALL be attempted.
- WHEN permission is denied THEN the UI SHALL show that state and in-app reminders SHALL continue to work.
- WHEN a browser notification is created THEN state SHALL be `attempted`, not `delivered`.

### Requirement 6: Privacy
- Audit records SHALL store ids and states, not commitment text, amounts or notes.
