import { describe, expect, it } from "vitest";
import type { Commitment, Occurrence } from "@/lib/domain/schema";
import { completeOccurrence, editSeries, listSeries, nextDates, occurrenceId, undoLatestCompletion } from "@/lib/recurrence/series";
import { makeCommitment, NOW_ISO } from "./fixtures";

const monthly = (over: Partial<Commitment> = {}) =>
  makeCommitment({ id: "fibre", dueDate: "2026-11-25", recurrence: { frequency: "monthly", interval: 1, startDate: "2026-11-25" }, ...over });
const T1 = "2026-11-25T08:00:00.000Z";

describe("completeOccurrence", () => {
  it("records history and advances to the next occurrence without completing the series", () => {
    const result = completeOccurrence(monthly(), [], T1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.commitment).toMatchObject({ status: "active", dueDate: "2026-12-25" });
    expect(result.commitment.completedAt).toBeUndefined();
    expect(result.occurrences).toEqual([{ id: "fibre:2026-11-25", userId: "user-a", commitmentId: "fibre", dueDate: "2026-11-25", completedAt: T1 }]);
    expect(result.next).toBe("2026-12-25");
  });
  it("does not complete the same occurrence twice", () => {
    const first = completeOccurrence(monthly(), [], T1);
    if (!first.ok) throw new Error("setup failed");
    // Re-running against the original (pre-advance) commitment must not duplicate history.
    const again = completeOccurrence(monthly(), first.occurrences, T1);
    expect(again.ok).toBe(false);
  });
  it("keeps the anchor day through month-end clamping", () => {
    let c = monthly({ dueDate: "2027-01-31", recurrence: { frequency: "monthly", interval: 1, startDate: "2027-01-31" } });
    let history: Occurrence[] = [];
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = completeOccurrence(c, history, T1);
      if (!r.ok) throw new Error(r.reason);
      c = r.commitment; history = r.occurrences; seen.push(c.dueDate);
    }
    expect(seen).toEqual(["2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]);
    expect(history.map((h) => h.dueDate)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });
  it("falls back to the current due date for rules saved without a start date", () => {
    const c = monthly({ recurrence: { frequency: "monthly", interval: 1 } });
    const r = completeOccurrence(c, [], T1);
    expect(r.ok && r.commitment.dueDate).toBe("2026-12-25");
  });
  it("completes the commitment when the series has ended", () => {
    const c = monthly({ recurrence: { frequency: "monthly", interval: 1, startDate: "2026-11-25", endDate: "2026-11-30" } });
    const r = completeOccurrence(c, [], T1);
    expect(r.ok && r.commitment.status).toBe("completed");
    expect(r.ok && r.commitment.completedAt).toBe(T1);
  });
  it("refuses one-off and inactive commitments", () => {
    expect(completeOccurrence(makeCommitment(), [], T1).ok).toBe(false);
    expect(completeOccurrence(monthly({ status: "archived" }), [], T1).ok).toBe(false);
  });
});

describe("undoLatestCompletion", () => {
  it("restores only the most recent completion", () => {
    const a = completeOccurrence(monthly(), [], T1);
    if (!a.ok) throw new Error("setup");
    const b = completeOccurrence(a.commitment, a.occurrences, T1);
    if (!b.ok) throw new Error("setup");
    expect(undoLatestCompletion(b.commitment, b.occurrences, occurrenceId("fibre", "2026-11-25"), NOW_ISO).ok).toBe(false);
    const undone = undoLatestCompletion(b.commitment, b.occurrences, occurrenceId("fibre", "2026-12-25"), NOW_ISO);
    expect(undone.ok && undone.commitment.dueDate).toBe("2026-12-25");
    expect(undone.ok && undone.occurrences.map((o) => o.dueDate)).toEqual(["2026-11-25"]);
  });
});

describe("listSeries and nextDates", () => {
  it("lists history plus the next three, unique and ordered", () => {
    const a = completeOccurrence(monthly(), [], T1);
    if (!a.ok) throw new Error("setup");
    const list = listSeries(a.commitment, a.occurrences, 3);
    expect(list.map((o) => `${o.dueDate}:${o.status}`)).toEqual([
      "2026-11-25:completed", "2026-12-25:upcoming", "2027-01-25:upcoming", "2027-02-25:upcoming",
    ]);
    expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
    expect(nextDates(a.commitment, 2)).toEqual(["2026-12-25", "2027-01-25"]);
  });
  it("returns nothing upcoming for one-off or archived items", () => {
    expect(nextDates(makeCommitment(), 3)).toEqual([]);
    expect(nextDates(monthly({ status: "archived" }), 3)).toEqual([]);
  });
});

describe("editSeries", () => {
  it("never changes completed history", () => {
    const a = completeOccurrence(monthly(), [], T1);
    if (!a.ok) throw new Error("setup");
    const before = JSON.stringify(a.occurrences);
    const edited = editSeries(a.commitment, { title: "Fibre (new plan)", amountMinor: 99900 }, NOW_ISO);
    expect(edited).toMatchObject({ title: "Fibre (new plan)", amountMinor: 99900, dueDate: "2026-12-25" });
    expect(JSON.stringify(a.occurrences)).toBe(before);
  });
  it("re-anchors the series when the due date moves", () => {
    const edited = editSeries(monthly({ recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 25, startDate: "2026-11-25" } }), { dueDate: "2026-12-05" }, NOW_ISO);
    expect(edited.recurrence).toMatchObject({ startDate: "2026-12-05", dayOfMonth: 5 });
    expect(nextDates(edited, 3)).toEqual(["2026-12-05", "2027-01-05", "2027-02-05"]);
  });
  it("can change the pattern or stop repeating", () => {
    const weekly = editSeries(monthly(), { recurrence: { frequency: "weekly", interval: 1 } }, NOW_ISO);
    expect(weekly.recurrence?.startDate).toBe("2026-11-25");
    expect(editSeries(monthly(), { recurrence: null }, NOW_ISO).recurrence).toBeUndefined();
  });
});
