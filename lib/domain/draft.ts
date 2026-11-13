import { parseDateOnly, todayIn, type DateOnly } from "@/lib/domain/dates";
import { fromMinor, toMinor } from "@/lib/domain/money";
import {
  commitmentSchema,
  type Commitment,
  type CommitmentType,
  type RecurrenceRule,
} from "@/lib/domain/schema";

/**
 * A draft is what a form edits: plain strings and a single "repeat" choice.
 * Converting a draft to a Commitment is the only place form input becomes domain data.
 */
export type RepeatChoice = "none" | "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";

export interface CommitmentDraft {
  title: string;
  description: string;
  type: CommitmentType;
  dueDate: DateOnly | "";
  repeat: RepeatChoice;
  amount: string; // major units, as typed
  currency: string;
  reminderOffsetsDays: number[];
}

export function ruleFromChoice(choice: RepeatChoice, dueDate: DateOnly): RecurrenceRule | undefined {
  const { day } = parseDateOnly(dueDate);
  switch (choice) {
    case "weekly": return { frequency: "weekly", interval: 1 };
    case "fortnightly": return { frequency: "weekly", interval: 2 };
    case "monthly": return { frequency: "monthly", interval: 1, dayOfMonth: day };
    case "quarterly": return { frequency: "quarterly", interval: 1, dayOfMonth: day };
    case "yearly": return { frequency: "yearly", interval: 1 };
    default: return undefined;
  }
}

export function choiceFromRule(rule: RecurrenceRule | undefined): RepeatChoice {
  if (!rule) return "none";
  if (rule.frequency === "weekly") return rule.interval === 2 ? "fortnightly" : "weekly";
  if (rule.frequency === "monthly" && rule.interval === 1) return "monthly";
  if (rule.frequency === "quarterly" && rule.interval === 1) return "quarterly";
  if (rule.frequency === "yearly" && rule.interval === 1) return "yearly";
  return "none";
}

export function emptyDraft(defaults: { dueDate: DateOnly; currency: string; reminders?: number[] }): CommitmentDraft {
  return {
    title: "",
    description: "",
    type: "custom",
    dueDate: defaults.dueDate,
    repeat: "none",
    amount: "",
    currency: defaults.currency,
    reminderOffsetsDays: defaults.reminders ?? [3, 1],
  };
}

export function draftFromCommitment(item: Commitment): CommitmentDraft {
  return {
    title: item.title,
    description: item.description ?? "",
    type: item.type,
    dueDate: item.dueDate,
    repeat: choiceFromRule(item.recurrence),
    amount: item.amountMinor === undefined || !item.currency ? "" : String(fromMinor(item.amountMinor, item.currency)),
    currency: item.currency ?? "ZAR",
    reminderOffsetsDays: item.reminderOffsetsDays,
  };
}

export type DraftResult = { ok: true; value: Commitment } | { ok: false; errors: string[] };

export interface DraftContext {
  userId: string;
  timezone: string;
  nowIso: string;
  newId: () => string;
  sourceType?: Commitment["sourceType"];
  /** When editing, identity, history and any rule the form cannot express are preserved. */
  existing?: Commitment;
}

export function draftToCommitment(draft: CommitmentDraft, context: DraftContext): DraftResult {
  const errors: string[] = [];
  const title = draft.title.trim();
  if (!title) errors.push("Title is required");
  if (!draft.dueDate) errors.push("Due date is required");

  let amountMinor: number | undefined;
  const amountText = draft.amount.trim();
  if (amountText !== "") {
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 0) errors.push("Amount must be zero or more");
    else amountMinor = toMinor(amount, draft.currency);
  }
  if (errors.length > 0 || !draft.dueDate) return { ok: false, errors };

  const { existing } = context;
  const keepExistingRule = existing && choiceFromRule(existing.recurrence) === draft.repeat;
  const candidate = {
    ...existing,
    id: existing?.id ?? context.newId(),
    userId: context.userId,
    title,
    description: draft.description.trim() || undefined,
    type: draft.type,
    status: existing?.status ?? "active",
    dueDate: draft.dueDate,
    timezone: existing?.timezone ?? context.timezone,
    amountMinor,
    currency: amountMinor === undefined ? undefined : draft.currency,
    recurrence: keepExistingRule ? existing?.recurrence : ruleFromChoice(draft.repeat, draft.dueDate),
    reminderOffsetsDays: [...draft.reminderOffsetsDays].sort((a, b) => b - a),
    sourceType: existing?.sourceType ?? context.sourceType ?? "manual",
    createdAt: existing?.createdAt ?? context.nowIso,
    updatedAt: context.nowIso,
  };
  const parsed = commitmentSchema.safeParse(candidate);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
}

/** Prototype parser output (see lib/capture.ts) as a form draft. Missing values stay missing. */
export interface LegacyProposal {
  title: string;
  category: string;
  dueAt: string | null;
  recurrence: RepeatChoice;
  amount: number | null;
  currency: string;
  description: string;
}

const CATEGORY_TYPE: Record<string, CommitmentType> = {
  payment: "bill", subscription: "subscription", appointment: "appointment", renewal: "renewal",
  household: "household", work: "work", personal: "custom",
};

export function draftFromProposal(proposal: LegacyProposal, timezone: string): CommitmentDraft {
  return {
    title: proposal.title,
    description: proposal.description,
    type: CATEGORY_TYPE[proposal.category] ?? "custom",
    dueDate: proposal.dueAt ? todayIn(timezone, new Date(proposal.dueAt)) : "",
    repeat: proposal.recurrence,
    amount: proposal.amount === null ? "" : String(proposal.amount),
    currency: proposal.currency,
    reminderOffsetsDays: [3, 1],
  };
}
