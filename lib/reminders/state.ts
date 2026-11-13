import type { ReminderInstance } from "@/lib/domain/schema";

/** Reminders the notification centre lists. Snoozed, dismissed and cancelled ones are hidden. */
export const isVisible = (instance: ReminderInstance) => instance.state === "due" || instance.state === "shown";

/** Visible reminders the user has not yet seen in the centre. */
export const isUnseen = (instance: ReminderInstance) => instance.state === "due";

/**
 * Move reminders whose time has come to `due`. A reminder only becomes `shown` when the notification centre
 * lists it (see markShown). Returns the same array when nothing changed, so repeated evaluation is stable.
 */
export function evaluateReminders(instances: readonly ReminderInstance[], now: Date): ReminderInstance[] {
  const t = now.getTime();
  let changed = false;
  const next = instances.map((instance) => {
    if (instance.state === "scheduled" && new Date(instance.fireAt).getTime() <= t) {
      changed = true;
      return { ...instance, state: "due" as const };
    }
    if (instance.state === "snoozed" && instance.snoozedUntil && new Date(instance.snoozedUntil).getTime() <= t) {
      changed = true;
      const { snoozedUntil, ...rest } = instance;
      void snoozedUntil;
      return { ...rest, state: "due" as const };
    }
    return instance;
  });
  return changed ? next : (instances as ReminderInstance[]);
}

function update(instances: readonly ReminderInstance[], ids: ReadonlySet<string>, change: (item: ReminderInstance) => ReminderInstance | undefined) {
  let changed = false;
  const next = instances.map((instance) => {
    if (!ids.has(instance.id)) return instance;
    const result = change(instance);
    if (!result) return instance;
    changed = true;
    return result;
  });
  return changed ? next : (instances as ReminderInstance[]);
}

/** Call when the notification centre has actually listed these reminders. due -> shown only. */
export function markShown(instances: readonly ReminderInstance[], ids: readonly string[], nowIso: string): ReminderInstance[] {
  return update(instances, new Set(ids), (item) => (item.state === "due" ? { ...item, state: "shown", shownAt: nowIso } : undefined));
}

/** Dismissed reminders do not come back. Cancelled and already dismissed ones are left alone. */
export function dismissReminder(instances: readonly ReminderInstance[], id: string, nowIso: string): ReminderInstance[] {
  return update(instances, new Set([id]), (item) => {
    if (item.state === "cancelled" || item.state === "dismissed") return undefined;
    const { snoozedUntil, ...rest } = item;
    void snoozedUntil;
    return { ...rest, state: "dismissed", dismissedAt: nowIso };
  });
}

/** Hide a visible reminder until `untilIso`, when it becomes due again. */
export function snoozeReminder(instances: readonly ReminderInstance[], id: string, untilIso: string): ReminderInstance[] {
  return update(instances, new Set([id]), (item) =>
    item.state === "due" || item.state === "shown" ? { ...item, state: "snoozed", snoozedUntil: untilIso } : undefined,
  );
}
