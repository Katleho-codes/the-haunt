import {
  commitmentSchema,
  occurrenceSchema,
  reminderInstanceSchema,
  settingsSchema,
  storedDataSchema,
  type Commitment,
  type Occurrence,
  type ReminderInstance,
  type Settings,
  type StoredData,
} from "@/lib/domain/schema";
import { migrateLegacyCommitments, migrateLegacySettings } from "@/lib/storage/migrate";
import type { CommitmentRepository, LoadStatus } from "@/lib/storage/repository";

/** Minimal subset of the Web Storage API so tests can pass an in-memory fake. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LEGACY_COMMITMENTS_KEY = "the-haunt.commitments.v1";
export const LEGACY_SETTINGS_KEY = "the-haunt.settings.v1";
const storeKey = (userId: string) => `the-haunt.store.v1.${userId}`;
const corruptKey = (userId: string, nowIso: string) => `the-haunt.corrupt.${userId}.${nowIso}`;

export interface LocalRepositoryOptions {
  storage: KeyValueStorage;
  timezone: string;
  now?: () => Date;
}

export class LocalStorageRepository implements CommitmentRepository {
  private readonly storage: KeyValueStorage;
  private readonly timezone: string;
  private readonly now: () => Date;

  constructor(options: LocalRepositoryOptions) {
    this.storage = options.storage;
    this.timezone = options.timezone;
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Load this user's data, migrating prototype data once. Corrupt data is copied
   * aside and reported; it is never replaced silently with demo records.
   */
  async init(userId: string): Promise<LoadStatus> {
    const raw = this.storage.getItem(storeKey(userId));
    if (raw !== null) {
      const parsed = this.parse(raw);
      if (parsed) return { kind: "loaded" };
      const backupKey = corruptKey(userId, this.now().toISOString());
      this.storage.setItem(backupKey, raw);
      this.storage.removeItem(storeKey(userId));
      return { kind: "corrupt", backupKey };
    }
    const legacyRaw = this.storage.getItem(LEGACY_COMMITMENTS_KEY);
    if (legacyRaw === null) return { kind: "empty" };
    let legacy: unknown;
    try {
      legacy = JSON.parse(legacyRaw);
    } catch {
      const backupKey = corruptKey(userId, this.now().toISOString());
      this.storage.setItem(backupKey, legacyRaw);
      return { kind: "corrupt", backupKey };
    }
    const nowIso = this.now().toISOString();
    const migrated = migrateLegacyCommitments(legacy, { userId, timezone: this.timezone, nowIso });
    let legacySettings: unknown;
    try {
      const rawSettings = this.storage.getItem(LEGACY_SETTINGS_KEY);
      legacySettings = rawSettings ? JSON.parse(rawSettings) : undefined;
    } catch {
      legacySettings = undefined;
    }
    this.write(userId, {
      version: 1,
      userId,
      commitments: migrated.commitments,
      occurrences: [],
      reminders: [],
      settings: migrateLegacySettings(legacySettings, this.timezone),
    });
    // Legacy keys are left in place as a backup until the user confirms.
    return { kind: "migrated", rejected: migrated.rejected.length, notes: migrated.notes };
  }

  async list(userId: string): Promise<Commitment[]> {
    return this.read(userId).commitments.filter((item) => item.userId === userId);
  }

  async get(userId: string, id: string): Promise<Commitment | undefined> {
    return (await this.list(userId)).find((item) => item.id === id);
  }

  async save(userId: string, commitment: Commitment): Promise<void> {
    if (commitment.userId !== userId) throw new Error("Commitment belongs to a different user");
    const valid = commitmentSchema.parse(commitment);
    const data = this.read(userId);
    const index = data.commitments.findIndex((item) => item.id === valid.id);
    if (index >= 0) data.commitments[index] = valid;
    else data.commitments.push(valid);
    this.write(userId, data);
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const data = this.read(userId);
    const next = data.commitments.filter((item) => item.id !== id);
    if (next.length === data.commitments.length) return false;
    // Deleting a commitment also deletes its completion history.
    this.write(userId, { ...data, commitments: next, occurrences: data.occurrences.filter((entry) => entry.commitmentId !== id), reminders: data.reminders.filter((entry) => entry.commitmentId !== id) });
    return true;
  }

  async replaceAll(userId: string, commitments: Commitment[]): Promise<void> {
    const valid = commitments.map((item) => {
      if (item.userId !== userId) throw new Error("Commitment belongs to a different user");
      return commitmentSchema.parse(item);
    });
    this.write(userId, { ...this.read(userId), commitments: valid });
  }

  async listOccurrences(userId: string): Promise<Occurrence[]> {
    return this.read(userId).occurrences.filter((entry) => entry.userId === userId);
  }

  async replaceOccurrences(userId: string, occurrences: Occurrence[]): Promise<void> {
    const valid = occurrences.map((entry) => {
      if (entry.userId !== userId) throw new Error("Occurrence belongs to a different user");
      return occurrenceSchema.parse(entry);
    });
    this.write(userId, { ...this.read(userId), occurrences: valid });
  }

  async listReminders(userId: string): Promise<ReminderInstance[]> {
    return this.read(userId).reminders.filter((entry) => entry.userId === userId);
  }

  async replaceReminders(userId: string, reminders: ReminderInstance[]): Promise<void> {
    const valid = reminders.map((entry) => {
      if (entry.userId !== userId) throw new Error("Reminder belongs to a different user");
      return reminderInstanceSchema.parse(entry);
    });
    this.write(userId, { ...this.read(userId), reminders: valid });
  }

  async getSettings(userId: string): Promise<Settings> {
    return this.read(userId).settings;
  }

  async saveSettings(userId: string, settings: Settings): Promise<void> {
    this.write(userId, { ...this.read(userId), settings: settingsSchema.parse(settings) });
  }

  async deleteAll(userId: string): Promise<void> {
    this.storage.removeItem(storeKey(userId));
    this.storage.removeItem(LEGACY_COMMITMENTS_KEY);
    this.storage.removeItem(LEGACY_SETTINGS_KEY);
  }

  private parse(raw: string): StoredData | undefined {
    try {
      const result = storedDataSchema.safeParse(JSON.parse(raw));
      return result.success ? result.data : undefined;
    } catch {
      return undefined;
    }
  }

  private read(userId: string): StoredData {
    const raw = this.storage.getItem(storeKey(userId));
    const parsed = raw === null ? undefined : this.parse(raw);
    return parsed ?? { version: 1, userId, commitments: [], occurrences: [], reminders: [], settings: settingsSchema.parse({ timezone: this.timezone }) };
  }

  private write(userId: string, data: StoredData): void {
    this.storage.setItem(storeKey(userId), JSON.stringify(data));
  }
}
