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

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  interval: z.number().int().min(1).max(99),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  endDate: dateOnlySchema.optional(),
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
});
export type Settings = z.infer<typeof settingsSchema>;

export const storedDataSchema = z.object({
  version: z.literal(1),
  userId: z.string().min(1),
  commitments: z.array(commitmentSchema),
  settings: settingsSchema,
});
export type StoredData = z.infer<typeof storedDataSchema>;
