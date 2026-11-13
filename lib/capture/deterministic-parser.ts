import { addDays, todayIn, weekdayOf, type DateOnly } from "@/lib/domain/dates";
import { commitmentProposalSchema, type CommitmentProposal } from "@/lib/capture/proposal";
import { classify, extractAmounts, extractDate, extractRecurrence, inferTitle, suggestReminders } from "@/lib/capture/extract";

export interface CaptureContext {
  /** Injected so results are reproducible in tests. */
  now: Date;
  /** IANA timezone used to decide what "today" is. */
  timezone: string;
}

const MAX_INPUT = 2000;

/**
 * Rule-based reader. It is NOT an AI model. It reads a short note and proposes a commitment.
 * - It never invents a missing date, amount, currency or repeat pattern. Missing values stay absent and are listed in
 *   `needsReview`.
 * - Values it had to work out (for example "the 25th every month" -> the next 25th) are flagged for confirmation.
 * - The result is always validated against the proposal schema before it leaves this function.
 */
export function parseCapture(raw: string, context: CaptureContext): CommitmentProposal {
  const text = raw.trim().slice(0, MAX_INPUT);
  const today = todayIn(context.timezone, context.now);
  const needsReview: string[] = [];
  const flag = (field: string, note: string) => needsReview.push(`${field}: ${note}`);
  const confidence: Record<string, number> = {};

  // Amount
  const amounts = extractAmounts(text);
  let amountMinor: number | undefined;
  let currency: string | undefined;
  if (amounts.length > 0) {
    amountMinor = amounts[0].amountMinor;
    currency = amounts[0].currency;
    confidence.amountMinor = amounts.length === 1 ? 0.9 : 0.5;
    if (amounts[0].assumed) flag("currency", amounts[0].assumed);
    if (amounts.length > 1) flag("amountMinor", `Several amounts were found (${amounts.length}); the first was used.`);
  }

  // Recurrence
  const match = extractRecurrence(text);
  const recurring = Boolean(match);

  // Type and title
  const classification = classify(text);
  confidence.type = classification.matched ? 0.7 : 0.3;
  if (!classification.matched) flag("type", "No clear category was found. Please choose one.");
  let title = inferTitle(text, classification.type);
  if (!title) {
    title = "Untitled commitment";
    flag("title", "No title could be read. Please name it.");
  }
  confidence.title = 0.6;

  // Date
  const extraction = extractDate(text, today, { recurring });
  let dueDate: DateOnly | undefined;
  let dayOfMonth: number | undefined;
  switch (extraction.kind) {
    case "exact":
      dueDate = extraction.date;
      confidence.dueDate = 0.95;
      break;
    case "derived":
      dueDate = extraction.date;
      dayOfMonth = extraction.dayOfMonth;
      confidence.dueDate = 0.6;
      flag("dueDate", extraction.note);
      break;
    case "partial":
    case "invalid":
      flag("dueDate", extraction.note);
      break;
    case "none":
      break;
  }
  if (!dueDate && match?.weekdays && match.weekdays.length === 1) {
    // "every Monday": the first date is the next such weekday, flagged.
    const delta = (match.weekdays[0] - weekdayOf(today) + 7) % 7;
    dueDate = addDays(today, delta);
    confidence.dueDate = 0.5;
    flag("dueDate", "Only the weekday was given; the next one is shown. Confirm the first date.");
  }
  if (!dueDate && !needsReview.some((entry) => entry.startsWith("dueDate:"))) {
    flag("dueDate", recurring ? "A repeating item needs a first due date. None was found." : "No date was found. Choose a due date.");
  }

  // Recurrence rule
  let recurrence: CommitmentProposal["recurrence"];
  if (match) {
    recurrence = { frequency: match.frequency, interval: match.interval };
    if (match.weekdays) recurrence.weekdays = match.weekdays;
    if (dayOfMonth && (match.frequency === "monthly" || match.frequency === "quarterly")) recurrence.dayOfMonth = dayOfMonth;
    confidence.recurrence = 0.85;
  }

  const offsets = dueDate || recurrence ? suggestReminders(classification.type) : [];

  const candidate = {
    title,
    // The note itself is shown during review (sourceSummary) but is not copied into the saved details,
    // where it would go stale if the user edits the amount or date.
    type: classification.type,
    dueDate,
    timezone: context.timezone,
    amountMinor,
    currency,
    recurrence,
    reminderSuggestions: offsets.length > 0 ? offsets.map((days) => ({ offsetMinutes: days * 1440, channel: "in_app" as const })) : undefined,
    confidence,
    needsReview,
    sourceSummary: text.slice(0, 140) || undefined,
    parser: "deterministic" as const,
  };
  const checked = commitmentProposalSchema.safeParse(candidate);
  if (checked.success) return checked.data;

  // Should be unreachable. Fall back to a minimal, honest proposal rather than failing the capture.
  return {
    title: (text.slice(0, 60) || "Untitled commitment").trim() || "Untitled commitment",
    type: "task",
    timezone: context.timezone,
    confidence: {},
    needsReview: ["dueDate: The note could not be read reliably. Please fill in the details."],
    parser: "deterministic",
  };
}
