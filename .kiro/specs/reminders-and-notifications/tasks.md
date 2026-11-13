# Reminders and notifications: tasks

Depends on recurrence-engine 3.6.

- [x] 4.1 Define `ReminderInstance` and state types; schema tests.
- [x] 4.2 Implement `planReminders`; tests for offsets, date-only default time, and past-due offsets.
- [x] 4.3 Implement `evaluateReminders`; tests including snooze expiry and double evaluation (idempotency).
- [x] 4.4 Implement `reconcile`; tests for edit, complete, delete and archive cancelling instances.
- [x] 4.5 Derive reminders from stored state and the clock on load and every 60 seconds (implemented in `haunt-app.tsx`, not a separate hook; a visibility-change re-check is not added).
- [x] 4.6 Build the notification centre with snooze and dismiss, keyboard accessible, with visible text states.
- [x] 4.7 Add "Send test reminder" labelled as a test.
- [x] 4.8 Add default reminder preferences (offsets and time of day) to The Keeper's Room.
- [ ] 4.9 NOT BUILT. Optional: Notification API permission flow; state `attempted` only. Verify on a real browser before claiming.
- [x] 4.10 Update README and UI copy: in-app only, no background delivery.
