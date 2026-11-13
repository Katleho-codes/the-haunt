# Reminders and notifications: design

## Source of truth
Stored reminder instances (`ReminderInstance { id, commitmentId, occurrenceId, fireAt, state, snoozedUntil? }`). The id is `occurrenceId + ":" + offsetMinutes`, so rebuilds are idempotent.

## Modules
- `lib/reminders/plan.ts`: `planReminders(commitment/occurrence, prefs): ReminderInstance[]` pure.
- `lib/reminders/evaluate.ts`: `evaluateReminders(instances, now): { due, updated }` pure; moves `scheduled` to `due` and wakes `snoozed`.
- `lib/reminders/reconcile.ts`: after any commitment change, cancels instances for removed or completed items and creates missing ones, without touching `dismissed` history.
- `components/notification-centre.tsx`: list, snooze, dismiss. Uses a `useReminders` hook that calls `evaluateReminders` on mount, on visibility change and on a 60-second timer.

## Honesty
The state names avoid "sent" and "delivered". A future provider-backed channel adds `queued`, `attempted`, `sent`, `delivered`, `failed` only when a provider reports them.

## Future server path
A worker would own scheduling and write provider states to the database. The pure planning functions would be reused on the server.
