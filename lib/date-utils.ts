import type { Commitment } from "@/lib/types";

export function dateAtOffset(days: number, hour = 12): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function startOfDay(value: string | Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function dayDiff(value: string | Date, from: string | Date = new Date()): number {
  const one = startOfDay(value).getTime();
  const two = startOfDay(from).getTime();
  return Math.round((one - two) / 86_400_000);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, options ?? { day: "numeric", month: "short" }).format(new Date(value));
}

export function relativeDue(value: string): string {
  const diff = dayDiff(value);
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff <= 6) return `In ${diff} days`;
  return formatDate(value, { day: "numeric", month: "long" });
}

export function money(amount: number | null, currency: string): string {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function nextOccurrence(commitment: Commitment): Date | null {
  if (commitment.recurrence === "none") return null;
  const next = new Date(commitment.dueAt);
  const now = new Date();
  while (next <= now) {
    switch (commitment.recurrence) {
      case "weekly": next.setDate(next.getDate() + 7); break;
      case "fortnightly": next.setDate(next.getDate() + 14); break;
      case "monthly": next.setMonth(next.getMonth() + 1); break;
      case "quarterly": next.setMonth(next.getMonth() + 3); break;
      case "yearly": next.setFullYear(next.getFullYear() + 1); break;
      default: return null;
    }
  }
  return next;
}
