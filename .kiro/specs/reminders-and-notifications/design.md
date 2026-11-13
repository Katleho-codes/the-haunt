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

## Implemented design (13 November 2026)
- Reminder offsets stay in whole days (`reminderOffsetsDays`), not minutes. The time of day is a user setting (default 09:00, profile timezone). A commitment's own `dueTime` is not used yet.
- `lib/reminders/plan.ts` plans only future moments, so new commitments do not fire instantly. `reconcile.ts` cancels reminders for completed, archived, deleted or re-dated items and moves scheduled ones when the time setting changes. `state.ts` holds evaluate, markShown, snooze and dismiss. All are pure.
- States: scheduled, due, shown, snoozed, dismissed, cancelled. `due` means the time arrived; `shown` is recorded when the notification centre closes after listing it. No state means sent or delivered.
- The UI derives the live list from stored instances, commitments and the clock, and folds the result back into state (render-time adjustment) so a planned reminder is not lost when its time passes.
- Only ids, dates, offsets and states are stored, never titles, notes or amounts.
- Limits: reminders are evaluated while the app is open (every minute and on load). If the app was closed, a reminder planned earlier appears as due on the next open; one that was never planned (for example created after its moment) is not created. Browser push (4.9) and email are not built.
