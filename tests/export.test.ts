import { describe, expect, it } from "vitest";
import { settingsSchema } from "@/lib/domain/schema";
import { buildExportBundle, exportBundleSchema } from "@/lib/storage/export";
import { makeCommitment, NOW_ISO } from "./fixtures";

const settings = settingsSchema.parse({ timezone: "Africa/Johannesburg" });
const occurrence = { id: "c-1:2026-10-25", userId: "user-a", commitmentId: "c-1", dueDate: "2026-10-25", completedAt: NOW_ISO };
const reminder = { id: "c-1:2026-11-25:1", userId: "user-a", commitmentId: "c-1", dueDate: "2026-11-25", offsetDays: 1, fireAt: "2026-11-24T07:00:00.000Z", state: "scheduled" as const };

describe("export bundle (review finding M-2)", () => {
  const bundle = buildExportBundle({ commitments: [makeCommitment()], occurrences: [occurrence], reminders: [reminder], settings }, NOW_ISO);

  it("carries commitments, completion history, reminders and settings", () => {
    expect(Object.keys(bundle).sort()).toEqual(["app", "commitments", "exportedAt", "occurrences", "reminders", "settings", "version"]);
    expect(bundle.occurrences).toEqual([occurrence]);
    expect(bundle.reminders).toEqual([reminder]);
    expect(bundle.version).toBe(1);
  });
  it("survives a JSON round trip and validates again, so a future import can trust it", () => {
    expect(exportBundleSchema.safeParse(JSON.parse(JSON.stringify(bundle))).success).toBe(true);
  });
  it("rejects a tampered file", () => {
    const tampered = JSON.parse(JSON.stringify(bundle));
    tampered.commitments[0].dueDate = "2026-02-30";
    expect(exportBundleSchema.safeParse(tampered).success).toBe(false);
    expect(exportBundleSchema.safeParse({ ...bundle, app: "other" }).success).toBe(false);
    expect(exportBundleSchema.safeParse({ ...bundle, version: 2 }).success).toBe(false);
  });
  it("refuses to build an invalid export", () => {
    expect(() => buildExportBundle({ commitments: [makeCommitment({ title: "" })], occurrences: [], reminders: [], settings }, NOW_ISO)).toThrow();
  });
  it("does not include anything that is not the person's own data (no keys, no tokens)", () => {
    expect(JSON.stringify(bundle)).not.toMatch(/api[_-]?key|token|secret|password/i);
  });
});