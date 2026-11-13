import { reviewNotes, type CommitmentProposal } from "@/lib/capture/proposal";
import type { CommitmentDraft, RepeatChoice } from "@/lib/domain/draft";
import { fromMinor } from "@/lib/domain/money";

/** The review form supports six fixed repeat patterns. Anything else is reported, never silently dropped. */
export function repeatFromRule(rule: CommitmentProposal["recurrence"]): RepeatChoice | undefined {
  if (!rule) return "none";
  if (rule.weekdays && rule.weekdays.length > 0) return undefined;
  if (rule.endDate) return undefined;
  if (rule.frequency === "weekly") return rule.interval === 1 ? "weekly" : rule.interval === 2 ? "fortnightly" : undefined;
  if (rule.interval !== 1) return undefined;
  if (rule.frequency === "monthly" || rule.frequency === "quarterly" || rule.frequency === "yearly") return rule.frequency;
  return undefined;
}

export interface ProposalReview {
  draft: CommitmentDraft;
  /** field name to a plain-language note, for the "Check this" markers */
  notes: Record<string, string>;
}

/** Turn a validated proposal into the editable review form. Nothing is saved here. */
export function proposalToReview(
  proposal: CommitmentProposal,
  defaults: { currency: string; reminderOffsetsDays: number[] },
): ProposalReview {
  const notes = reviewNotes(proposal);
  const repeat = repeatFromRule(proposal.recurrence);
  if (repeat === undefined) {
    notes.recurrence = "This repeat pattern cannot be set in the form yet, so the item will not repeat. Pick the closest option or add it as a one-off.";
  }
  const suggested = (proposal.reminderSuggestions ?? [])
    .filter((item) => item.channel === "in_app")
    .map((item) => Math.round(item.offsetMinutes / 1440));
  return {
    draft: {
      title: proposal.title,
      description: proposal.description ?? "",
      type: proposal.type,
      dueDate: proposal.dueDate ?? "",
      repeat: repeat ?? "none",
      dayOfMonth: proposal.recurrence?.dayOfMonth,
      amount: proposal.amountMinor === undefined || !proposal.currency ? "" : String(fromMinor(proposal.amountMinor, proposal.currency)),
      currency: proposal.currency ?? defaults.currency,
      reminderOffsetsDays: suggested.length > 0 ? suggested : defaults.reminderOffsetsDays,
    },
    notes,
  };
}
