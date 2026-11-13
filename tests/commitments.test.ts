import { describe, expect, it } from "vitest";
import {
  archiveCommitment, completeCommitment, filterCommitments, groupForHall, restoreCommitment, sortCommitments,
} from "@/lib/domain/commitments";
import { commitmentSchema } from "@/lib/domain/schema";
import { makeCommitment, NOW_ISO } from "./fixtures";

const LATER = "2026-11-14T09:00:00.000Z";

describe("lifecycle", () => {
  it("completes without mutating the input and stays schema-valid", () => {
    const item = makeCommitment();
    const done = completeCommitment(item, LATER);
    expect(item.status).toBe("active");
    expect(done.status).toBe("completed");
    expect(done.completedAt).toBe(LATER);
    expect(commitmentSchema.safeParse(done).success).toBe(true);
  });
  it("restores to active and clears the completion time", () => {
    const restored = restoreCommitment(completeCommitment(makeCommitment(), LATER), NOW_ISO);
    expect(restored.status).toBe("active");
    expect(restored.completedAt).toBeUndefined();
    expect(commitmentSchema.safeParse(restored).success).toBe(true);
  });
  it("archives while keeping history fields", () => {
    const archived = archiveCommitment(makeCommitment({ title: "Keep me" }), LATER);
    expect(archived.status).toBe("archived");
    expect(archived.title).toBe("Keep me");
    expect(commitmentSchema.safeParse(archived).success).toBe(true);
  });
});

describe("groupForHall", () => {
  const today = "2026-11-20";
  const items = [
    makeCommitment({ id: "overdue", dueDate: "2026-11-18" }),
    makeCommitment({ id: "today", dueDate: "2026-11-20" }),
    makeCommitment({ id: "soon", dueDate: "2026-11-27" }),
    makeCommitment({ id: "later", dueDate: "2026-11-28" }),
    makeCommitment({ id: "done", dueDate: "2026-11-19", status: "completed", completedAt: NOW_ISO }),
  ];
  it("splits by the user's calendar today and ignores inactive items", () => {
    const groups = groupForHall(items, today);
    expect(groups.overdue.map((i) => i.id)).toEqual(["overdue"]);
    expect(groups.dueToday.map((i) => i.id)).toEqual(["today"]);
    expect(groups.upcoming.map((i) => i.id)).toEqual(["soon"]);
    expect(groups.later.map((i) => i.id)).toEqual(["later"]);
  });
});

describe("filter and sort", () => {
  const items = [
    makeCommitment({ id: "1", title: "Fibre account", type: "bill", dueDate: "2026-11-25" }),
    makeCommitment({ id: "2", title: "Dentist", description: "Check-up", type: "appointment", dueDate: "2026-11-20", amountMinor: undefined, currency: undefined }),
    makeCommitment({ id: "3", title: "Streaming", type: "subscription", dueDate: "2026-11-28", recurrence: { frequency: "monthly", interval: 1 } }),
  ];
  it("searches title and description case-insensitively", () => {
    expect(filterCommitments(items, { text: "CHECK" }).map((i) => i.id)).toEqual(["2"]);
  });
  it("combines filters", () => {
    expect(filterCommitments(items, { recurring: true, from: "2026-11-26" }).map((i) => i.id)).toEqual(["3"]);
    expect(filterCommitments(items, { category: "bill", to: "2026-11-24" })).toEqual([]);
  });
  it("sorts deterministically", () => {
    expect(sortCommitments(items, "dueDate").map((i) => i.id)).toEqual(["2", "1", "3"]);
    expect(sortCommitments(items, "title").map((i) => i.id)).toEqual(["2", "1", "3"]);
  });
});
