import { z } from "zod";
import {
  COMMITMENT_TYPES, RECURRENCE_FREQUENCIES, currencySchema, dateOnlySchema, localTimeSchema, timeZoneSchema,
} from "@/lib/domain/schema";

/**
 * A proposal is a suggestion, never a saved commitment. It is validated at the boundary so that output from any
 * parser (deterministic today, a model later) cannot put malformed data into the review form.
 *
 * `needsReview` entries are written "field: note" (for example "dueDate: Confirm the next due date.").
 * Fields that could not be determined are absent, never guessed.
 */
export const PARSERS = ["deterministic", "llm"] as const;

export const reminderSuggestionSchema = z.object({
  offsetMinutes: z.number().int().min(0).max(525_600),
  channel: z.enum(["in_app", "push", "email"]),
});

export const commitmentProposalSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2000).optional(),
    type: z.enum(COMMITMENT_TYPES),
    category: z.string().max(60).optional(),
    dueDate: dateOnlySchema.optional(),
    dueTime: localTimeSchema.optional(),
    timezone: timeZoneSchema,
    amountMinor: z.number().int().min(0).optional(),
    currency: currencySchema.optional(),
    recurrence: z
      .object({
        frequency: z.enum(RECURRENCE_FREQUENCIES),
        interval: z.number().int().min(1).max(99),
        weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
        dayOfMonth: z.number().int().min(1).max(31).optional(),
        endDate: dateOnlySchema.optional(),
      })
      .optional(),
    reminderSuggestions: z.array(reminderSuggestionSchema).max(10).optional(),
    confidence: z.record(z.string(), z.number().min(0).max(1)),
    needsReview: z.array(z.string().min(1).max(300)).max(20),
    sourceSummary: z.string().max(300).optional(),
    parser: z.enum(PARSERS),
  })
  .superRefine((value, ctx) => {
    if (value.amountMinor !== undefined && !value.currency) {
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Currency is required when an amount is present" });
    }
    if (!value.dueDate && !value.needsReview.some((entry) => entry.startsWith("dueDate:"))) {
      ctx.addIssue({ code: "custom", path: ["needsReview"], message: "A missing due date must be listed in needsReview" });
    }
  });

export type CommitmentProposal = z.infer<typeof commitmentProposalSchema>;

/** Field name to note for everything the user should double-check. */
export function reviewNotes(proposal: Pick<CommitmentProposal, "needsReview">): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const entry of proposal.needsReview) {
    const index = entry.indexOf(": ");
    const field = index > 0 ? entry.slice(0, index) : "general";
    const note = index > 0 ? entry.slice(index + 2) : entry;
    notes[field] = notes[field] ? `${notes[field]} ${note}` : note;
  }
  return notes;
}
