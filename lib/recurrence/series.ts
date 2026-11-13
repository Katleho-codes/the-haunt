import { compareDateOnly, parseDateOnly, type DateOnly } from "@/lib/domain/dates";
import type { Commitment, Occurrence, RecurrenceRule } from "@/lib/domain/schema";
import { nextOccurrenceAfter, upcomingOccurrences } from "@/lib/recurrence/generate";

/**
 * A recurring commitment is the series master. `dueDate` is its current (next unfinished) occurrence.
 * Completed occurrences are history records. Upcoming occurrences are derived from the rule, so there is
 * nothing to duplicate and regeneration is idempotent by construction.
 */

export const occurrenceId = (commitmentId: string, dueDate: DateOnly) => `${commitmentId}:${dueDate}`;

/** The anchor the rule counts from. Rules saved before `startDate` existed fall back to the current due date. */
export function seriesStart(commitment: Commitment): DateOnly {
  return commitment.recurrence?.startDate ?? commitment.dueDate;
}

export type CompleteResult =
  | { ok: true; commitment: Commitment; occurrences: Occurrence[]; next?: DateOnly }
  | { ok: false; reason: string };

/**
 * Complete the current occurrence of a recurring commitment and advance to the next one.
 * Other occurrences and earlier history are untouched. Completing the same occurrence twice is a no-op.
 * When no further occurrence exists (end date reached) the commitment itself becomes completed.
 */
export function completeOccurrence(
  commitment: Commitment,
  history: readonly Occurrence[],
  nowIso: string,
): CompleteResult {
  const rule = commitment.recurrence;
  if (!rule) return { ok: false, reason: "Commitment does not repeat" };
  if (commitment.status !== "active") return { ok: false, reason: "Only active commitments can be completed" };

  const id = occurrenceId(commitment.id, commitment.dueDate);
  if (history.some((entry) => entry.id === id)) return { ok: false, reason: "This occurrence is already completed" };

  const record: Occurrence = {
    id,
    userId: commitment.userId,
    commitmentId: commitment.id,
    dueDate: commitment.dueDate,
    completedAt: nowIso,
  };
  const next = nextOccurrenceAfter(rule, seriesStart(commitment), commitment.dueDate);
  const updated: Commitment = next
    ? { ...commitment, dueDate: next, updatedAt: nowIso }
    : { ...commitment, status: "completed", completedAt: nowIso, updatedAt: nowIso };
  return { ok: true, commitment: updated, occurrences: [...history, record], next };
}

/**
 * Undo the most recent completion only. Older completions are history and are not rewritten.
 */
export function undoLatestCompletion(
  commitment: Commitment,
  history: readonly Occurrence[],
  targetId: string,
  nowIso: string,
): CompleteResult {
  const own = history.filter((entry) => entry.commitmentId === commitment.id);
  const latest = [...own].sort((a, b) => compareDateOnly(b.dueDate, a.dueDate))[0];
  if (!latest || latest.id !== targetId) return { ok: false, reason: "Only the most recent completion can be undone" };
  const restored: Commitment = { ...commitment, dueDate: latest.dueDate, status: "active", updatedAt: nowIso };
  delete restored.completedAt;
  return { ok: true, commitment: restored, occurrences: history.filter((entry) => entry.id !== targetId) };
}

export interface SeriesOccurrence {
  id: string;
  dueDate: DateOnly;
  status: "completed" | "upcoming";
}

/** Completed history plus the next `count` upcoming dates, unique by id and ordered by date. */
export function listSeries(
  commitment: Commitment,
  history: readonly Occurrence[],
  count = 3,
): SeriesOccurrence[] {
  const byId = new Map<string, SeriesOccurrence>();
  for (const entry of history) {
    if (entry.commitmentId === commitment.id) byId.set(entry.id, { id: entry.id, dueDate: entry.dueDate, status: "completed" });
  }
  if (commitment.recurrence && commitment.status === "active") {
    // Begin at the current occurrence so an overdue one is still listed.
    for (const date of upcomingOccurrences(commitment.recurrence, seriesStart(commitment), commitment.dueDate, count)) {
      const id = occurrenceId(commitment.id, date);
      if (!byId.has(id)) byId.set(id, { id, dueDate: date, status: "upcoming" });
    }
  }
  return [...byId.values()].sort((a, b) => compareDateOnly(a.dueDate, b.dueDate) || a.id.localeCompare(b.id));
}

export function nextDates(commitment: Commitment, count: number): DateOnly[] {
  if (!commitment.recurrence || commitment.status !== "active") return [];
  return upcomingOccurrences(commitment.recurrence, seriesStart(commitment), commitment.dueDate, count);
}

/**
 * Edit the series master (scope "entire series, future occurrences"). Completed history lives in separate
 * records, so it cannot change. When the due date or the repeat pattern changes, the series is re-anchored
 * at the new due date so future dates follow the new pattern.
 */
export function editSeries(
  commitment: Commitment,
  patch: Partial<Pick<Commitment, "title" | "description" | "type" | "dueDate" | "dueTime" | "amountMinor" | "currency" | "reminderOffsetsDays">> & {
    recurrence?: RecurrenceRule | null;
  },
  nowIso: string,
): Commitment {
  const { recurrence, ...rest } = patch;
  const next: Commitment = { ...commitment, ...rest, updatedAt: nowIso };
  const dueChanged = rest.dueDate !== undefined && rest.dueDate !== commitment.dueDate;
  if (recurrence === null) {
    delete next.recurrence;
  } else if (recurrence !== undefined) {
    next.recurrence = { ...recurrence, startDate: recurrence.startDate ?? next.dueDate };
  } else if (dueChanged && commitment.recurrence) {
    const { day } = parseDateOnly(next.dueDate);
    next.recurrence = {
      ...commitment.recurrence,
      startDate: next.dueDate,
      ...(commitment.recurrence.dayOfMonth !== undefined ? { dayOfMonth: day } : {}),
    };
  }
  return next;
}
