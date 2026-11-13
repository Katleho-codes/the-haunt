import { z } from "zod";
import { isValidDateOnly, isValidLocalTime, isValidTimeZone } from "@/lib/domain/dates";

export const COMMITMENT_TYPES = [
  "task", "bill", "subscription", "appointment", "renewal",
  "household", "work", "study", "membership", "custom",
] as const;
export const COMMITMENT_STATUSES = ["active", "completed", "archived"] as const;
export const SOURCE_TYPES = ["manual", "pasted_text", "image", "pdf", "voice", "imported"] as const;
export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly"] as const;

export const dateOnlySchema = z.string().refine(isValidDateOnly, "Must be a real calendar date (YYYY-MM-DD)");
export const localTimeSchema = z.string().refine(isValidLocalTime, "Must be a time (HH:mm)");
export const timeZoneSchema = z.string().refine(isValidTimeZone, "Must be an IANA timezone");

function isKnownCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    return Intl.supportedValuesOf("currency").includes(code);
  } catch {
    return true; // runtime without supportedValuesOf: the format check above still applies
  }
}
export const currencySchema = z.string().refine(isKnownCurrency, "Must be an ISO 4217 currency code");

export const recurrenceRuleSchema = z
  .object({
    frequency: z.enum(RECURRENCE_FREQUENCIES),
    interval: z.number().int().min(1).max(99),
    /** Weekly rules only: days of week, 0 = Sunday. */
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    /** Monthly and quarterly rules: the day the user means, kept even when a short month clamps it. */
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    /** Anchor of the series. Occurrences are computed from this, never from the previous occurrence. */
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.weekdays && rule.frequency !== "weekly") {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Weekdays only apply to weekly rules" });
    }
    if (rule.dayOfMonth && rule.frequency !== "monthly" && rule.frequency !== "quarterly") {
      ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: "Day of month only applies to monthly or quarterly rules" });
    }
    if (rule.startDate && rule.endDate && rule.endDate < rule.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must not be before the start date" });
    }
  });
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

const MAX_TITLE = 160;
const MAX_DESCRIPTION = 2000;

export const commitmentSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    title: z.string().trim().min(1, "Title is required").max(MAX_TITLE),
    description: z.string().max(MAX_DESCRIPTION).optional(),
    type: z.enum(COMMITMENT_TYPES),
    category: z.string().max(60).optional(),
    status: z.enum(COMMITMENT_STATUSES),
    dueDate: dateOnlySchema,
    dueTime: localTimeSchema.optional(),
    timezone: timeZoneSchema,
    amountMinor: z.number().int().min(0).optional(),
    currency: currencySchema.optional(),
    recurrence: recurrenceRuleSchema.optional(),
    reminderOffsetsDays: z.array(z.number().int().min(0).max(365)).max(10).default([]),
    sourceType: z.enum(SOURCE_TYPES),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.amountMinor !== undefined && !value.currency) {
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Currency is required when an amount is present" });
    }
    if (value.status === "completed" && !value.completedAt) {
      ctx.addIssue({ code: "custom", path: ["completedAt"], message: "Completed commitments need a completion time" });
    }
    if (value.status !== "completed" && value.completedAt) {
      ctx.addIssue({ code: "custom", path: ["completedAt"], message: "Only completed commitments have a completion time" });
    }
  });

/** A completed occurrence of a recurring commitment. Upcoming occurrences are derived, not stored. */
export const occurrenceSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  commitmentId: z.string().min(1),
  dueDate: dateOnlySchema,
  completedAt: z.string().datetime(),
});
export type Occurrence = z.infer<typeof occurrenceSchema>;

/**
 * In-app reminder lifecycle. These words describe what THE HAUNT did, not what a provider delivered:
 * scheduled (waiting) > due (time reached, not yet seen) > shown (listed in the notification centre)
 * > dismissed, or snoozed (back to due later), or cancelled (the commitment changed).
 */
export const REMINDER_STATES = ["scheduled", "due", "shown", "snoozed", "dismissed", "cancelled"] as const;
export const reminderInstanceSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  commitmentId: z.string().min(1),
  /** The occurrence this reminder is for. No title, amount or notes are stored here. */
  dueDate: dateOnlySchema,
  offsetDays: z.number().int().min(0).max(365),
  fireAt: z.string().datetime(),
  state: z.enum(REMINDER_STATES),
  snoozedUntil: z.string().datetime().optional(),
  shownAt: z.string().datetime().optional(),
  dismissedAt: z.string().datetime().optional(),
});
export type ReminderInstance = z.infer<typeof reminderInstanceSchema>;
export type ReminderState = (typeof REMINDER_STATES)[number];

export type Commitment = z.infer<typeof commitmentSchema>;
export type CommitmentType = (typeof COMMITMENT_TYPES)[number];
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const settingsSchema = z.object({
  locale: z.string().min(2).default("en-ZA"),
  timezone: timeZoneSchema.default("Africa/Johannesburg"),
  currency: currencySchema.default("ZAR"),
  ambience: z.boolean().default(false),
  effects: z.boolean().default(false),
  volume: z.number().min(0).max(1).default(0.24),
  reduceMotion: z.boolean().default(false),
  /** Time of day reminders appear, in the profile timezone. */
  reminderTime: localTimeSchema.default("09:00"),
  /** Days before the due date, used for new commitments. */
  defaultReminderOffsets: z.array(z.number().int().min(0).max(365)).max(10).default([3, 1]),
});
export type Settings = z.infer<typeof settingsSchema>;

export const storedDataSchema = z.object({
  version: z.literal(1),
  userId: z.string().min(1),
  commitments: z.array(commitmentSchema),
  occurrences: z.array(occurrenceSchema).default([]),
  reminders: z.array(reminderInstanceSchema).default([]),
  settings: settingsSchema,
});
export type StoredData = z.infer<typeof storedDataSchema>;
