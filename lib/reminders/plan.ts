import { addDays, type DateOnly, type LocalTime } from "@/lib/domain/dates";
import type { Commitment, ReminderInstance } from "@/lib/domain/schema";
import { zonedDateTimeToInstant } from "@/lib/recurrence/zoned";

export interface ReminderPrefs {
  timezone: string;
  /** Time of day reminders appear, in the profile timezone. */
  reminderTime: LocalTime;
}

/** Deterministic id: planning twice for the same occurrence and offset gives the same reminder. */
export const reminderId = (commitmentId: string, dueDate: DateOnly, offsetDays: number) =>
  `${commitmentId}:${dueDate}:${offsetDays}`;

/** When a reminder for `dueDate`, `offsetDays` before, should become due. */
export function fireAtFor(dueDate: DateOnly, offsetDays: number, prefs: ReminderPrefs): Date {
  return zonedDateTimeToInstant(addDays(dueDate, -offsetDays), prefs.reminderTime, prefs.timezone);
}

/**
 * Reminders for a commitment's current occurrence. Only moments that are still in the future are planned, so
 * creating a commitment due tomorrow does not immediately fire a "3 days before" reminder.
 * Inactive commitments have no reminders.
 */
export function planReminders(commitment: Commitment, prefs: ReminderPrefs, now: Date): ReminderInstance[] {
  if (commitment.status !== "active") return [];
  const offsets = [...new Set(commitment.reminderOffsetsDays)].sort((a, b) => b - a);
  const planned: ReminderInstance[] = [];
  for (const offsetDays of offsets) {
    const fireAt = fireAtFor(commitment.dueDate, offsetDays, prefs);
    if (fireAt.getTime() <= now.getTime()) continue;
    planned.push({
      id: reminderId(commitment.id, commitment.dueDate, offsetDays),
      userId: commitment.userId,
      commitmentId: commitment.id,
      dueDate: commitment.dueDate,
      offsetDays,
      fireAt: fireAt.toISOString(),
      state: "scheduled",
    });
  }
  return planned;
}
