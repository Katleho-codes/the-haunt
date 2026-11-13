import type { Commitment, ReminderInstance } from "@/lib/domain/schema";
import { fireAtFor, planReminders, type ReminderPrefs } from "@/lib/reminders/plan";

const PRUNE_AFTER_MS = 30 * 86_400_000;
const OPEN_STATES = new Set<ReminderInstance["state"]>(["scheduled", "due", "shown", "snoozed"]);

function isWanted(instance: ReminderInstance, commitment: Commitment | undefined): commitment is Commitment {
  return (
    commitment !== undefined &&
    commitment.status === "active" &&
    commitment.dueDate === instance.dueDate &&
    commitment.reminderOffsetsDays.includes(instance.offsetDays)
  );
}

/**
 * Bring stored reminders in line with the commitments. Pure and idempotent: running it twice with the same
 * inputs returns an equal result.
 * - Reminders for commitments that were completed, archived, deleted or re-dated are cancelled.
 * - Missing reminders are added (future moments only).
 * - Scheduled reminders move when the reminder time or timezone preference changes.
 * - Dismissed, shown and snoozed reminders are never recreated or reset by this function.
 * - Old dismissed or cancelled records are pruned after 30 days.
 */
export function reconcileReminders(
  existing: readonly ReminderInstance[],
  commitments: readonly Commitment[],
  prefs: ReminderPrefs,
  now: Date,
): ReminderInstance[] {
  const byCommitment = new Map(commitments.map((item) => [item.id, item]));
  const result = new Map<string, ReminderInstance>();

  for (const instance of existing) {
    const commitment = byCommitment.get(instance.commitmentId);
    if (!isWanted(instance, commitment)) {
      result.set(instance.id, OPEN_STATES.has(instance.state) ? { ...instance, state: "cancelled" } : instance);
      continue;
    }
    if (instance.state === "scheduled") {
      const fireAt = fireAtFor(instance.dueDate, instance.offsetDays, prefs).toISOString();
      result.set(instance.id, fireAt === instance.fireAt ? instance : { ...instance, fireAt });
    } else if (instance.state === "cancelled") {
      // The commitment went back to this date/offset (for example an edit was reverted).
      const fireAt = fireAtFor(instance.dueDate, instance.offsetDays, prefs);
      result.set(
        instance.id,
        fireAt.getTime() > now.getTime() ? { ...instance, state: "scheduled", fireAt: fireAt.toISOString() } : instance,
      );
    } else {
      result.set(instance.id, instance);
    }
  }

  for (const commitment of commitments) {
    for (const planned of planReminders(commitment, prefs, now)) {
      if (!result.has(planned.id)) result.set(planned.id, planned);
    }
  }

  const kept = [...result.values()].filter((instance) => {
    if (OPEN_STATES.has(instance.state)) return true;
    return now.getTime() - new Date(instance.fireAt).getTime() < PRUNE_AFTER_MS;
  });
  kept.sort((a, b) => a.fireAt.localeCompare(b.fireAt) || a.id.localeCompare(b.id));
  return sameList(kept, existing) ? (existing as ReminderInstance[]) : kept;
}

function sameList(a: readonly ReminderInstance[], b: readonly ReminderInstance[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}
