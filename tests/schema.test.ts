import { describe, expect, it } from "vitest";
import { commitmentSchema } from "@/lib/domain/schema";
import { makeCommitment } from "./fixtures";

const messages = (input: unknown) => {
  const result = commitmentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("commitment schema", () => {
  it("accepts a valid commitment", () => {
    expect(commitmentSchema.safeParse(makeCommitment()).success).toBe(true);
  });
  it("rejects an empty or whitespace title", () => {
    expect(messages(makeCommitment({ title: "   " })).join()).toContain("title");
  });
  it("rejects impossible due dates", () => {
    expect(messages(makeCommitment({ dueDate: "2027-02-30" })).join()).toContain("dueDate");
  });
  it("requires a currency when an amount is present", () => {
    expect(messages(makeCommitment({ currency: undefined })).join()).toContain("currency");
  });
  it("rejects negative or fractional minor-unit amounts", () => {
    expect(messages(makeCommitment({ amountMinor: -1 })).join()).toContain("amountMinor");
    expect(messages(makeCommitment({ amountMinor: 10.5 })).join()).toContain("amountMinor");
  });
  it("accepts zero amounts", () => {
    expect(commitmentSchema.safeParse(makeCommitment({ amountMinor: 0 })).success).toBe(true);
  });
  it("rejects unknown currencies and timezones", () => {
    expect(messages(makeCommitment({ currency: "ZZZ" })).join()).toContain("currency");
    expect(messages(makeCommitment({ timezone: "Nowhere/Land" })).join()).toContain("timezone");
  });
  it("validates recurrence limits", () => {
    expect(messages(makeCommitment({ recurrence: { frequency: "monthly", interval: 0 } })).join()).toContain("interval");
    expect(messages(makeCommitment({ recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 32 } })).join()).toContain("dayOfMonth");
  });
  it("keeps completedAt consistent with status", () => {
    expect(messages(makeCommitment({ status: "completed" })).join()).toContain("completedAt");
    expect(messages(makeCommitment({ completedAt: NOW })).join()).toContain("completedAt");
  });
  it("validates due time format", () => {
    expect(commitmentSchema.safeParse(makeCommitment({ dueTime: "09:30" })).success).toBe(true);
    expect(messages(makeCommitment({ dueTime: "25:00" })).join()).toContain("dueTime");
  });
});

const NOW = "2026-11-13T08:00:00.000Z";
