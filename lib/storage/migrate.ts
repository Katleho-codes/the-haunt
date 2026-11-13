import { parseDateOnly, todayIn, type DateOnly } from "@/lib/domain/dates";
import { toMinor } from "@/lib/domain/money";
import {
  commitmentSchema,
  type Commitment,
  type CommitmentType,
  type RecurrenceRule,
  type Settings,
  settingsSchema,
} from "@/lib/domain/schema";

/** Shape written by the localStorage prototype (before schema version 1). */
interface LegacyCommitment {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  dueAt?: unknown;
  recurrence?: unknown;
  amount?: unknown;
  currency?: unknown;
  reminders?: unknown;
  status?: unknown;
  source?: unknown;
  createdAt?: unknown;
  completedAt?: unknown;
}

export interface MigrationResult {
  commitments: Commitment[];
  /** Records that could not be converted. They are reported, never silently dropped. */
  rejected: Array<{ index: number; reason: string }>;
  notes: string[];
}

const CATEGORY_TO_TYPE: Record<string, CommitmentType> = {
  payment: "bill",
  subscription: "subscription",
  appointment: "appointment",
  renewal: "renewal",
  household: "household",
  work: "work",
  personal: "custom",
};

const SOURCE_MAP: Record<string, Commitment["sourceType"]> = {
  manual: "manual",
  text: "pasted_text",
  document: "imported",
  voice: "voice",
};

function legacyRecurrence(value: unknown, dueDate: DateOnly): RecurrenceRule | undefined {
  const { day } = parseDateOnly(dueDate);
  switch (value) {
    case "weekly": return { frequency: "weekly", interval: 1 };
    case "fortnightly": return { frequency: "weekly", interval: 2 };
    case "monthly": return { frequency: "monthly", interval: 1, dayOfMonth: day };
    case "quarterly": return { frequency: "quarterly", interval: 1, dayOfMonth: day };
    case "yearly": return { frequency: "yearly", interval: 1 };
    default: return undefined;
  }
}

function asIso(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return new Date(time).toISOString();
  }
  return fallback;
}

export function migrateLegacyCommitments(
  raw: unknown,
  options: { userId: string; timezone: string; nowIso: string },
): MigrationResult {
  const result: MigrationResult = {
    commitments: [],
    rejected: [],
    notes: [
      "Due dates were converted to calendar dates using the profile timezone. Original times of day were not kept.",
    ],
  };
  if (!Array.isArray(raw)) {
    result.rejected.push({ index: -1, reason: "Stored data was not a list" });
    return result;
  }
  raw.forEach((entry: LegacyCommitment, index) => {
    try {
      if (typeof entry !== "object" || entry === null) throw new Error("Not an object");
      const dueInstant = new Date(String(entry.dueAt));
      if (Number.isNaN(dueInstant.getTime())) throw new Error("Due date missing or invalid");
      const dueDate = todayIn(options.timezone, dueInstant);
      const currency = typeof entry.currency === "string" ? entry.currency : "ZAR";
      const hasAmount = typeof entry.amount === "number" && Number.isFinite(entry.amount) && entry.amount >= 0;
      const completed = entry.status === "completed";
      const createdAt = asIso(entry.createdAt, options.nowIso);
      const candidate = {
        id: typeof entry.id === "string" && entry.id ? entry.id : `migrated-${index}`,
        userId: options.userId,
        title: typeof entry.title === "string" ? entry.title : "",
        description: typeof entry.description === "string" && entry.description ? entry.description : undefined,
        type: CATEGORY_TO_TYPE[String(entry.category)] ?? "custom",
        status: completed ? "completed" : entry.status === "archived" ? "archived" : "active",
        dueDate,
        timezone: options.timezone,
        amountMinor: hasAmount ? toMinor(entry.amount as number, currency) : undefined,
        currency: hasAmount ? currency : undefined,
        recurrence: legacyRecurrence(entry.recurrence, dueDate),
        reminderOffsetsDays: Array.isArray(entry.reminders)
          ? entry.reminders.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 365)
          : [],
        sourceType: SOURCE_MAP[String(entry.source)] ?? "manual",
        createdAt,
        updatedAt: options.nowIso,
        completedAt: completed ? asIso(entry.completedAt, options.nowIso) : undefined,
      };
      const parsed = commitmentSchema.safeParse(candidate);
      if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
      result.commitments.push(parsed.data);
    } catch (error) {
      result.rejected.push({ index, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  return result;
}

/** Prototype settings stored volume as 0-100; version 1 stores 0-1. Unknown fields fall back to safe defaults. */
export function migrateLegacySettings(raw: unknown, timezone: string): Settings {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const volume = typeof source.volume === "number" && Number.isFinite(source.volume)
    ? Math.min(1, Math.max(0, source.volume > 1 ? source.volume / 100 : source.volume))
    : undefined;
  const parsed = settingsSchema.safeParse({
    ambience: source.ambience === true,
    effects: source.effects === true,
    reduceMotion: source.reduceMotion === true,
    currency: typeof source.currency === "string" ? source.currency : undefined,
    timezone,
    volume,
  });
  return parsed.success ? parsed.data : settingsSchema.parse({ timezone });
}
