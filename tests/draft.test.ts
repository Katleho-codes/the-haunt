import { describe, expect, it } from "vitest";
import { buildDemoCommitments } from "@/lib/domain/demo-data";
import {
  choiceFromRule, draftFromCommitment, draftToCommitment, emptyDraft, ruleFromChoice,
  type CommitmentDraft,
} from "@/lib/domain/draft";
import { dueLabel, formatDateList, recurrenceLabel } from "@/lib/domain/present";
import { makeCommitment, NOW_ISO } from "./fixtures";

const ctx = { userId: "user-a", timezone: "Africa/Johannesburg", nowIso: NOW_ISO, newId: () => "new-id" };
const base = (over: Partial<CommitmentDraft> = {}): CommitmentDraft => ({
  ...emptyDraft({ dueDate: "2026-11-25", currency: "ZAR" }), title: "Fibre", ...over,
});

describe("draft to commitment", () => {
  it("builds a valid commitment with minor-unit money", () => {
    const result = draftToCommitment(base({ amount: "899.50", repeat: "monthly", type: "bill" }), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ id: "new-id", userId: "user-a", status: "active", amountMinor: 89950, currency: "ZAR", sourceType: "manual" });
      expect(result.value.recurrence).toEqual({ frequency: "monthly", interval: 1, dayOfMonth: 25, startDate: "2026-11-25" });
    }
  });
  it("omits the currency when there is no amount", () => {
    const result = draftToCommitment(base(), ctx);
    expect(result.ok && result.value.currency).toBeFalsy();
  });
  it("explains missing required fields", () => {
    const result = draftToCommitment(base({ title: "  ", dueDate: "" }), ctx);
    expect(result).toEqual({ ok: false, errors: ["Title is required", "Due date is required"] });
  });
  it("rejects negative and non-numeric amounts", () => {
    expect(draftToCommitment(base({ amount: "-5" }), ctx).ok).toBe(false);
    expect(draftToCommitment(base({ amount: "abc" }), ctx).ok).toBe(false);
  });
  it("keeps identity, history and unchanged recurrence when editing", () => {
    const existing = makeCommitment({ id: "keep", createdAt: "2026-01-01T00:00:00.000Z", recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 31 } });
    const result = draftToCommitment({ ...draftFromCommitment(existing), title: "Renamed" }, { ...ctx, existing });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("keep");
      expect(result.value.createdAt).toBe("2026-01-01T00:00:00.000Z");
      expect(result.value.recurrence?.dayOfMonth).toBe(31);
      expect(result.value.title).toBe("Renamed");
    }
  });
  it("re-anchors a recurring item when its due date is edited", () => {
    const existing = makeCommitment({ id: "keep", recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 25, startDate: "2026-06-25" } });
    const result = draftToCommitment({ ...draftFromCommitment(existing), dueDate: "2026-12-05" }, { ...ctx, existing });
    expect(result.ok && result.value.recurrence).toEqual({ frequency: "monthly", interval: 1, dayOfMonth: 5, startDate: "2026-12-05" });
  });
  it("round-trips repeat choices", () => {
    for (const choice of ["none", "weekly", "fortnightly", "monthly", "quarterly", "yearly"] as const) {
      expect(choiceFromRule(ruleFromChoice(choice, "2026-11-25"))).toBe(choice);
    }
  });
});

describe("presentation", () => {
  it("labels due dates", () => {
    expect(dueLabel("2026-11-12", "2026-11-13")).toBe("1 day overdue");
    expect(dueLabel("2026-11-13", "2026-11-13")).toBe("Due today");
    expect(dueLabel("2026-11-14", "2026-11-13")).toBe("Due tomorrow");
    expect(dueLabel("2026-11-16", "2026-11-13")).toBe("In 3 days");
  });
  it("lists dates with the year only where it is not this year", () => {
    const today = "2026-11-21";
    expect(formatDateList(["2026-11-25", "2026-12-25"], today, "en-ZA")).toBe("25 Nov · 25 Dec");
    expect(formatDateList(["2026-11-25", "2026-12-25", "2027-01-25"], today, "en-ZA")).toBe("25 Nov · 25 Dec · 25 Jan 2027");
    const yearly = formatDateList(["2027-03-18", "2028-03-18", "2029-03-18"], today, "en-ZA");
    expect(yearly).toBe("18 Mar 2027 · 18 Mar 2028 · 18 Mar 2029");
    expect(new Set(yearly.split(" · ")).size).toBe(3); // never the same text three times
    expect(formatDateList([], today, "en-ZA")).toBe("");
  });
  it("labels recurrence", () => {
    expect(recurrenceLabel({ frequency: "weekly", interval: 2 })).toBe("fortnightly");
    expect(recurrenceLabel(undefined)).toBe("none");
  });
});

describe("demo data", () => {
  it("is fictional, valid and owned by the requested user", () => {
    const items = buildDemoCommitments("user-a", "Africa/Johannesburg", NOW_ISO);
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.userId === "user-a")).toBe(true);
    expect(items.find((i) => i.id === "demo-fibre")?.amountMinor).toBe(89900);
  });
});
