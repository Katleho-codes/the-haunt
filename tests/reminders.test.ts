import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, makeDateOnly } from "@/lib/domain/dates";
import type { ReminderInstance } from "@/lib/domain/schema";
import { planReminders, reminderId, type ReminderPrefs } from "@/lib/reminders/plan";
import { reconcileReminders } from "@/lib/reminders/reconcile";
import { dismissReminder, evaluateReminders, isUnseen, isVisible, markShown, snoozeReminder } from "@/lib/reminders/state";
import { completeOccurrence } from "@/lib/recurrence/series";
import { makeCommitment } from "./fixtures";

const prefs: ReminderPrefs = { timezone: "Africa/Johannesburg", reminderTime: "09:00" }; // 09:00 SAST = 07:00Z
const at = (iso: string) => new Date(iso);
const base = makeCommitment({ id: "fibre", dueDate: "2026-11-25", reminderOffsetsDays: [3, 1] });
const states = (list: readonly ReminderInstance[]) => list.map((i) => `${i.offsetDays}:${i.state}`);

describe("planReminders", () => {
  it("plans one reminder per offset at the preferred time of day", () => {
    const planned = planReminders(base, prefs, at("2026-11-13T08:00:00Z"));
    expect(planned.map((p) => [p.id, p.fireAt, p.state])).toEqual([
      ["fibre:2026-11-25:3", "2026-11-22T07:00:00.000Z", "scheduled"],
      ["fibre:2026-11-25:1", "2026-11-24T07:00:00.000Z", "scheduled"],
    ]);
  });
  it("does not plan moments that are already in the past", () => {
    expect(planReminders(base, prefs, at("2026-11-23T10:00:00Z")).map((p) => p.offsetDays)).toEqual([1]);
    expect(planReminders(makeCommitment({ dueDate: "2026-11-13", reminderOffsetsDays: [0] }), prefs, at("2026-11-13T10:00:00Z"))).toEqual([]);
  });
  it("plans nothing for completed or archived commitments", () => {
    const completed = makeCommitment({ status: "completed", completedAt: "2026-11-10T08:00:00.000Z" });
    expect(planReminders(completed, prefs, at("2026-11-01T00:00:00Z"))).toEqual([]);
    expect(planReminders({ ...base, status: "archived" }, prefs, at("2026-11-01T00:00:00Z"))).toEqual([]);
  });
  it("dedupes repeated offsets", () => {
    expect(planReminders({ ...base, reminderOffsetsDays: [1, 1, 3] }, prefs, at("2026-11-01T00:00:00Z"))).toHaveLength(2);
  });
});

describe("evaluateReminders and states", () => {
  const scheduled = planReminders(base, prefs, at("2026-11-13T08:00:00Z"));
  it("becomes due only when the time is reached", () => {
    expect(states(evaluateReminders(scheduled, at("2026-11-22T06:59:00Z")))).toEqual(["3:scheduled", "1:scheduled"]);
    expect(states(evaluateReminders(scheduled, at("2026-11-22T07:00:00Z")))).toEqual(["3:due", "1:scheduled"]);
  });
  it("is idempotent: evaluating again returns the same list", () => {
    const once = evaluateReminders(scheduled, at("2026-11-25T00:00:00Z"));
    expect(evaluateReminders(once, at("2026-11-25T00:00:00Z"))).toBe(once);
    expect(states(once)).toEqual(["3:due", "1:due"]);
  });
  it("is only shown after the centre lists it", () => {
    const due = evaluateReminders(scheduled, at("2026-11-25T00:00:00Z"));
    expect(due.every(isUnseen)).toBe(true);
    const shown = markShown(due, [due[0].id], "2026-11-25T08:00:00.000Z");
    expect(states(shown)).toEqual(["3:shown", "1:due"]);
    expect(shown[0].shownAt).toBe("2026-11-25T08:00:00.000Z");
    expect(markShown(shown, [shown[0].id], "2026-11-26T08:00:00.000Z")).toBe(shown); // not due: unchanged
    expect(markShown(scheduled, [scheduled[0].id], "2026-11-13T08:00:00.000Z")).toBe(scheduled); // never seen: stays scheduled
  });
  it("snooze hides a reminder until its time, then it is due again", () => {
    const due = evaluateReminders(scheduled, at("2026-11-25T00:00:00Z"));
    const snoozed = snoozeReminder(due, due[0].id, "2026-11-25T12:00:00.000Z");
    expect(snoozed[0].state).toBe("snoozed");
    expect(isVisible(snoozed[0])).toBe(false);
    expect(evaluateReminders(snoozed, at("2026-11-25T11:59:00Z"))[0].state).toBe("snoozed");
    const back = evaluateReminders(snoozed, at("2026-11-25T12:00:00Z"));
    expect(back[0].state).toBe("due");
    expect(back[0].snoozedUntil).toBeUndefined();
  });
  it("dismissed reminders never come back", () => {
    const due = evaluateReminders(scheduled, at("2026-11-25T00:00:00Z"));
    const dismissed = dismissReminder(due, due[0].id, "2026-11-25T08:00:00.000Z");
    expect(dismissed[0].state).toBe("dismissed");
    expect(evaluateReminders(dismissed, at("2027-01-01T00:00:00Z"))[0].state).toBe("dismissed");
    expect(dismissReminder(dismissed, due[0].id, "2026-11-26T00:00:00.000Z")).toBe(dismissed);
    expect(snoozeReminder(dismissed, due[0].id, "2026-12-01T00:00:00.000Z")).toBe(dismissed);
  });
});

describe("reconcileReminders", () => {
  const now = at("2026-11-13T08:00:00Z");
  it("creates reminders once and is idempotent", () => {
    const first = reconcileReminders([], [base], prefs, now);
    expect(first).toHaveLength(2);
    expect(reconcileReminders(first, [base], prefs, now)).toBe(first);
  });
  it("cancels reminders when the commitment is completed, archived or deleted", () => {
    const first = reconcileReminders([], [base], prefs, now);
    expect(states(reconcileReminders(first, [{ ...base, status: "archived" }], prefs, now))).toEqual(["3:cancelled", "1:cancelled"]);
    expect(states(reconcileReminders(first, [], prefs, now))).toEqual(["3:cancelled", "1:cancelled"]);
  });
  it("cancels old reminders and plans new ones when the due date changes", () => {
    const first = reconcileReminders([], [base], prefs, now);
    const moved = reconcileReminders(first, [{ ...base, dueDate: "2026-12-10" }], prefs, now);
    expect(moved.filter((i) => i.state === "cancelled")).toHaveLength(2);
    expect(moved.filter((i) => i.state === "scheduled").map((i) => `${i.dueDate}@${i.fireAt}`)).toEqual(["2026-12-10@2026-12-07T07:00:00.000Z", "2026-12-10@2026-12-09T07:00:00.000Z"]);
  });
  it("cancels a reminder whose offset was removed and keeps the rest", () => {
    const first = reconcileReminders([], [base], prefs, now);
    expect(states(reconcileReminders(first, [{ ...base, reminderOffsetsDays: [1] }], prefs, now))).toEqual(["3:cancelled", "1:scheduled"]);
  });
  it("does not recreate or reset a dismissed reminder", () => {
    const first = reconcileReminders([], [base], prefs, now);
    const due = evaluateReminders(first, at("2026-11-25T00:00:00Z"));
    const dismissed = dismissReminder(due, due[0].id, "2026-11-25T08:00:00.000Z");
    const again = reconcileReminders(dismissed, [base], prefs, at("2026-11-25T08:00:00Z"));
    expect(states(again)).toEqual(["3:dismissed", "1:due"]);
  });
  it("moves scheduled reminders when the reminder time changes, but not seen ones", () => {
    const first = reconcileReminders([], [base], prefs, now);
    const due = evaluateReminders(first, at("2026-11-22T08:00:00Z")); // 3-day reminder is due
    const later = reconcileReminders(due, [base], { ...prefs, reminderTime: "18:00" }, at("2026-11-22T08:00:00Z"));
    expect(later[0].state).toBe("due");
    expect(later[0].fireAt).toBe(first[0].fireAt);
    expect(later[1].fireAt).toBe("2026-11-24T16:00:00.000Z");
  });
  it("revives a cancelled reminder if the commitment returns to the same date and offset", () => {
    const first = reconcileReminders([], [base], prefs, now);
    const cancelled = reconcileReminders(first, [], prefs, now);
    expect(states(reconcileReminders(cancelled, [base], prefs, now))).toEqual(["3:scheduled", "1:scheduled"]);
  });
  it("follows a recurring series: completing an occurrence cancels its reminders and plans the next", () => {
    const monthly = makeCommitment({ id: "fibre", dueDate: "2026-11-25", reminderOffsetsDays: [1], recurrence: { frequency: "monthly", interval: 1, startDate: "2026-11-25" } });
    const first = reconcileReminders([], [monthly], prefs, now);
    const done = completeOccurrence(monthly, [], "2026-11-25T08:00:00.000Z");
    if (!done.ok) throw new Error("setup");
    const next = reconcileReminders(first, [done.commitment], prefs, at("2026-11-25T08:00:00Z"));
    expect(next.map((i) => `${i.dueDate}:${i.state}`)).toEqual(["2026-11-25:cancelled", "2026-12-25:scheduled"]);
  });
  it("prunes old closed records after 30 days but keeps open ones", () => {
    const old: ReminderInstance = { id: "x:2026-01-10:1", userId: "user-a", commitmentId: "x", dueDate: "2026-01-10", offsetDays: 1, fireAt: "2026-01-09T07:00:00.000Z", state: "dismissed", dismissedAt: "2026-01-09T08:00:00.000Z" };
    expect(reconcileReminders([old], [], prefs, at("2026-03-01T00:00:00Z"))).toEqual([]);
    expect(reconcileReminders([old], [], prefs, at("2026-01-20T00:00:00Z"))).toEqual([old]);
  });
  it("stores ids, dates and states only, never commitment text or money", () => {
    const [first] = reconcileReminders([], [makeCommitment({ title: "Secret surgery", description: "private", amountMinor: 123456 })], prefs, now);
    const text = JSON.stringify(first);
    expect(text).not.toContain("Secret");
    expect(text).not.toContain("private");
    expect(text).not.toContain("123456");
  });
});

describe("reminder properties", () => {
  const arbCommitment = fc.record({
    offset: fc.integer({ min: 0, max: 20 }),
    due: fc.integer({ min: 0, max: 60 }),
    offsets: fc.uniqueArray(fc.integer({ min: 0, max: 20 }), { maxLength: 4 }),
    now: fc.integer({ min: 0, max: 80 }),
    hour: fc.integer({ min: 0, max: 23 }),
  });
  it("reconcile is idempotent, ids are unique and nothing is planned in the past", () => {
    fc.assert(
      fc.property(arbCommitment, ({ due, offsets, now, hour }) => {
        const dueDate = addDays(makeDateOnly(2026, 11, 1), due);
        const clock = new Date(Date.UTC(2026, 10, 1) + now * 86_400_000 + hour * 3_600_000);
        const item = makeCommitment({ dueDate, reminderOffsetsDays: offsets });
        const p = { ...prefs, reminderTime: `${String(hour).padStart(2, "0")}:00` };
        const once = reconcileReminders([], [item], p, clock);
        expect(reconcileReminders(once, [item], p, clock)).toBe(once);
        expect(new Set(once.map((i) => i.id)).size).toBe(once.length);
        for (const i of once) expect(new Date(i.fireAt).getTime()).toBeGreaterThan(clock.getTime());
        expect(once.every((i) => i.id === reminderId(i.commitmentId, i.dueDate, i.offsetDays))).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
