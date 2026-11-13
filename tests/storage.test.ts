import { describe, expect, it } from "vitest";
import { commitmentSchema } from "@/lib/domain/schema";
import {
  LEGACY_COMMITMENTS_KEY, LEGACY_SETTINGS_KEY, LocalStorageRepository,
} from "@/lib/storage/local-storage-repository";
import { migrateLegacyCommitments, migrateLegacySettings } from "@/lib/storage/migrate";
import { makeCommitment, MemoryStorage, NOW_ISO } from "./fixtures";

const TZ = "Africa/Johannesburg";
const fixedNow = () => new Date(NOW_ISO);

const legacyItem = {
  id: "seed-fibre",
  title: "Fibre subscription",
  description: "Home internet account.",
  category: "subscription",
  dueAt: "2026-11-25T07:00:00.000Z",
  recurrence: "monthly",
  amount: 899,
  currency: "ZAR",
  reminders: [3, 1],
  status: "pending",
  source: "manual",
  createdAt: "2026-10-01T10:00:00.000Z",
};

describe("legacy migration", () => {
  it("converts a prototype record to the version 1 model", () => {
    const { commitments, rejected } = migrateLegacyCommitments([legacyItem], { userId: "u", timezone: TZ, nowIso: NOW_ISO });
    expect(rejected).toEqual([]);
    const item = commitments[0];
    expect(item.dueDate).toBe("2026-11-25");
    expect(item.amountMinor).toBe(89900);
    expect(item.status).toBe("active");
    expect(item.type).toBe("subscription");
    expect(item.recurrence).toEqual({ frequency: "monthly", interval: 1, dayOfMonth: 25, startDate: "2026-11-25" });
    expect(item.reminderOffsetsDays).toEqual([3, 1]);
    expect(commitmentSchema.safeParse(item).success).toBe(true);
  });
  it("uses the profile timezone for the calendar day", () => {
    const late = { ...legacyItem, dueAt: "2026-11-24T23:30:00.000Z" };
    expect(migrateLegacyCommitments([late], { userId: "u", timezone: TZ, nowIso: NOW_ISO }).commitments[0].dueDate).toBe("2026-11-25");
    expect(migrateLegacyCommitments([late], { userId: "u", timezone: "UTC", nowIso: NOW_ISO }).commitments[0].dueDate).toBe("2026-11-24");
  });
  it("maps fortnightly to a two-week weekly rule and keeps completion", () => {
    const done = { ...legacyItem, recurrence: "fortnightly", status: "completed", completedAt: "2026-11-01T10:00:00.000Z", amount: null };
    const item = migrateLegacyCommitments([done], { userId: "u", timezone: TZ, nowIso: NOW_ISO }).commitments[0];
    expect(item.recurrence).toEqual({ frequency: "weekly", interval: 2, startDate: "2026-11-25" });
    expect(item.status).toBe("completed");
    expect(item.amountMinor).toBeUndefined();
  });
  it("reports unusable records instead of dropping them silently", () => {
    const result = migrateLegacyCommitments([legacyItem, { id: "bad", title: "", dueAt: "nope" }, 42], { userId: "u", timezone: TZ, nowIso: NOW_ISO });
    expect(result.commitments).toHaveLength(1);
    expect(result.rejected.map((r) => r.index)).toEqual([1, 2]);
  });
  it("converts legacy 0-100 volume to 0-1", () => {
    expect(migrateLegacySettings({ volume: 24, effects: true }, TZ)).toMatchObject({ volume: 0.24, effects: true, ambience: false });
    expect(migrateLegacySettings("garbage", TZ).effects).toBe(false);
  });
});

describe("LocalStorageRepository", () => {
  const make = (storage = new MemoryStorage()) => ({ storage, repo: new LocalStorageRepository({ storage, timezone: TZ, now: fixedNow }) });

  it("starts empty without inventing demo data", async () => {
    const { repo } = make();
    expect(await repo.init("user-a")).toEqual({ kind: "empty" });
    expect(await repo.list("user-a")).toEqual([]);
  });
  it("persists across repository instances", async () => {
    const { storage, repo } = make();
    await repo.save("user-a", makeCommitment());
    const reloaded = new LocalStorageRepository({ storage, timezone: TZ, now: fixedNow });
    expect(await reloaded.init("user-a")).toEqual({ kind: "loaded" });
    expect((await reloaded.list("user-a")).map((i) => i.id)).toEqual(["c-1"]);
  });
  it("never returns another user's records", async () => {
    const { repo } = make();
    await repo.save("user-a", makeCommitment());
    expect(await repo.list("user-b")).toEqual([]);
    expect(await repo.get("user-b", "c-1")).toBeUndefined();
    expect(await repo.remove("user-b", "c-1")).toBe(false);
    expect(await repo.list("user-a")).toHaveLength(1);
  });
  it("rejects writing a record owned by someone else", async () => {
    const { repo } = make();
    await expect(repo.save("user-b", makeCommitment({ userId: "user-a" }))).rejects.toThrow();
    await expect(repo.replaceAll("user-b", [makeCommitment()])).rejects.toThrow();
  });
  it("rejects invalid records at the boundary", async () => {
    const { repo } = make();
    await expect(repo.save("user-a", makeCommitment({ title: "" }))).rejects.toThrow();
  });
  it("updates in place and removes", async () => {
    const { repo } = make();
    await repo.save("user-a", makeCommitment());
    await repo.save("user-a", makeCommitment({ title: "Fibre (renamed)" }));
    expect((await repo.list("user-a"))).toHaveLength(1);
    expect((await repo.get("user-a", "c-1"))?.title).toBe("Fibre (renamed)");
    expect(await repo.remove("user-a", "c-1")).toBe(true);
    expect(await repo.list("user-a")).toEqual([]);
  });
  it("migrates prototype data once and keeps the originals as a backup", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_COMMITMENTS_KEY, JSON.stringify([legacyItem]));
    storage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ volume: 50, ambience: true }));
    const repo = new LocalStorageRepository({ storage, timezone: TZ, now: fixedNow });
    const status = await repo.init("user-a");
    expect(status.kind).toBe("migrated");
    expect(await repo.list("user-a")).toHaveLength(1);
    expect((await repo.getSettings("user-a")).volume).toBe(0.5);
    expect(storage.getItem(LEGACY_COMMITMENTS_KEY)).not.toBeNull();
    expect((await repo.init("user-a")).kind).toBe("loaded");
  });
  it("keeps corrupt data aside instead of replacing it with demo records", async () => {
    const storage = new MemoryStorage();
    storage.setItem("the-haunt.store.v1.user-a", "{not json");
    const repo = new LocalStorageRepository({ storage, timezone: TZ, now: fixedNow });
    const status = await repo.init("user-a");
    expect(status.kind).toBe("corrupt");
    if (status.kind === "corrupt") expect(storage.getItem(status.backupKey)).toBe("{not json");
    expect(await repo.list("user-a")).toEqual([]);
  });
  it("stores completion history per user and removes it with its commitment", async () => {
    const { repo } = make();
    await repo.save("user-a", makeCommitment({ recurrence: { frequency: "monthly", interval: 1 } }));
    const entry = { id: "c-1:2026-10-25", userId: "user-a", commitmentId: "c-1", dueDate: "2026-10-25", completedAt: NOW_ISO };
    await repo.replaceOccurrences("user-a", [entry]);
    expect(await repo.listOccurrences("user-a")).toEqual([entry]);
    expect(await repo.listOccurrences("user-b")).toEqual([]);
    await expect(repo.replaceOccurrences("user-b", [entry])).rejects.toThrow();
    await repo.remove("user-a", "c-1");
    expect(await repo.listOccurrences("user-a")).toEqual([]);
  });
  it("loads data saved before occurrences existed", async () => {
    const storage = new MemoryStorage();
    storage.setItem("the-haunt.store.v1.user-a", JSON.stringify({ version: 1, userId: "user-a", commitments: [makeCommitment()], settings: {} }));
    const repo = new LocalStorageRepository({ storage, timezone: TZ, now: fixedNow });
    expect((await repo.init("user-a")).kind).toBe("loaded");
    expect(await repo.listOccurrences("user-a")).toEqual([]);
  });
  it("deletes all user data including legacy copies", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_COMMITMENTS_KEY, JSON.stringify([legacyItem]));
    const repo = new LocalStorageRepository({ storage, timezone: TZ, now: fixedNow });
    await repo.init("user-a");
    await repo.deleteAll("user-a");
    expect(storage.data.size).toBe(0);
  });
});
