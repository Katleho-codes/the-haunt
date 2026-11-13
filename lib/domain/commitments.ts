import { compareDateOnly, diffDays, type DateOnly } from "@/lib/domain/dates";
import type { Commitment, CommitmentStatus } from "@/lib/domain/schema";

/** Lifecycle functions are pure: they return a new object and never mutate the input. */

export function completeCommitment(item: Commitment, nowIso: string): Commitment {
  if (item.status === "completed") return item;
  return { ...item, status: "completed", completedAt: nowIso, updatedAt: nowIso };
}

export function restoreCommitment(item: Commitment, nowIso: string): Commitment {
  if (item.status === "active") return item;
  const { completedAt, ...rest } = item;
  void completedAt;
  return { ...rest, status: "active", updatedAt: nowIso };
}

export function archiveCommitment(item: Commitment, nowIso: string): Commitment {
  if (item.status === "archived") return item;
  const { completedAt, ...rest } = item;
  void completedAt;
  return { ...rest, status: "archived", updatedAt: nowIso };
}

export interface HallGroups {
  overdue: Commitment[];
  dueToday: Commitment[];
  upcoming: Commitment[];
  later: Commitment[];
}

/** Group active commitments for The Hall using the user's calendar `today`. */
export function groupForHall(items: readonly Commitment[], today: DateOnly, upcomingDays = 7): HallGroups {
  const groups: HallGroups = { overdue: [], dueToday: [], upcoming: [], later: [] };
  for (const item of items) {
    if (item.status !== "active") continue;
    const delta = diffDays(item.dueDate, today);
    if (delta < 0) groups.overdue.push(item);
    else if (delta === 0) groups.dueToday.push(item);
    else if (delta <= upcomingDays) groups.upcoming.push(item);
    else groups.later.push(item);
  }
  const byDue = (a: Commitment, b: Commitment) =>
    compareDateOnly(a.dueDate, b.dueDate) || (a.dueTime ?? "").localeCompare(b.dueTime ?? "") || a.title.localeCompare(b.title);
  for (const list of Object.values(groups)) list.sort(byDue);
  return groups;
}

export type SortKey = "dueDate" | "createdAt" | "title";

export interface CommitmentFilter {
  text?: string;
  category?: string;
  status?: CommitmentStatus;
  from?: DateOnly;
  to?: DateOnly;
  recurring?: boolean;
}

export function filterCommitments(items: readonly Commitment[], filter: CommitmentFilter): Commitment[] {
  const needle = filter.text?.trim().toLowerCase();
  return items.filter((item) => {
    if (needle && !`${item.title} ${item.description ?? ""}`.toLowerCase().includes(needle)) return false;
    if (filter.category && item.category !== filter.category && item.type !== filter.category) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.from && compareDateOnly(item.dueDate, filter.from) < 0) return false;
    if (filter.to && compareDateOnly(item.dueDate, filter.to) > 0) return false;
    if (filter.recurring !== undefined && Boolean(item.recurrence) !== filter.recurring) return false;
    return true;
  });
}

export function sortCommitments(items: readonly Commitment[], key: SortKey): Commitment[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (key === "title") return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    if (key === "createdAt") return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    return compareDateOnly(a.dueDate, b.dueDate) || (a.dueTime ?? "").localeCompare(b.dueTime ?? "") || a.id.localeCompare(b.id);
  });
  return copy;
}
