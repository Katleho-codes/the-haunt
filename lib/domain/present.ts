import { diffDays, formatDateOnly, type DateOnly } from "@/lib/domain/dates";
import type { CommitmentType, RecurrenceRule } from "@/lib/domain/schema";

export const TYPE_LABELS: Record<CommitmentType, string> = {
  task: "Task",
  bill: "Payment",
  subscription: "Subscription",
  appointment: "Appointment",
  renewal: "Renewal",
  household: "Household",
  work: "Work",
  study: "Study",
  membership: "Membership",
  custom: "Personal",
};

/** Human wording for a due date relative to the user's calendar today. */
export function dueLabel(dueDate: DateOnly, today: DateOnly, locale?: string): string {
  const diff = diffDays(dueDate, today);
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 6) return `In ${diff} days`;
  return formatDateOnly(dueDate, locale, { day: "numeric", month: "long" });
}

export function recurrenceLabel(rule: RecurrenceRule | undefined): string {
  if (!rule) return "none";
  const n = rule.interval;
  switch (rule.frequency) {
    case "daily": return n === 1 ? "daily" : `every ${n} days`;
    case "weekly": return n === 1 ? "weekly" : n === 2 ? "fortnightly" : `every ${n} weeks`;
    case "monthly": return n === 1 ? "monthly" : `every ${n} months`;
    case "quarterly": return n === 1 ? "quarterly" : `every ${n} quarters`;
    case "yearly": return n === 1 ? "yearly" : `every ${n} years`;
  }
}
