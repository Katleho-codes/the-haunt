# Reminders and notifications: tasks

Depends on recurrence-engine 3.6.

- [ ] 4.1 Define `ReminderInstance` and state types; schema tests.
- [ ] 4.2 Implement `planReminders`; tests for offsets, date-only default time, and past-due offsets.
- [ ] 4.3 Implement `evaluateReminders`; tests including snooze expiry and double evaluation (idempotency).
- [ ] 4.4 Implement `reconcile`; tests for edit, complete, delete and archive cancelling instances.
- [ ] 4.5 Add `useReminders` hook with mount, visibility and 60-second evaluation.
- [ ] 4.6 Build the notification centre with snooze and dismiss, keyboard accessible, with visible text states.
- [ ] 4.7 Add "Send test reminder" labelled as a test.
- [ ] 4.8 Add default reminder preferences (offsets and time of day) to The Keeper's Room.
- [ ] 4.9 Optional: Notification API permission flow; state `attempted` only. Verify on a real browser before claiming.
- [ ] 4.10 Update README and UI copy: in-app only, no background delivery.
