export type CommitmentCategory =
  | "payment"
  | "subscription"
  | "appointment"
  | "renewal"
  | "household"
  | "work"
  | "personal";

export type CommitmentStatus = "pending" | "completed" | "archived";
export type Recurrence = "none" | "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";

export interface Commitment {
  id: string;
  title: string;
  description: string;
  category: CommitmentCategory;
  dueAt: string;
  recurrence: Recurrence;
  amount: number | null;
  currency: string;
  reminders: number[];
  status: CommitmentStatus;
  source: "manual" | "text" | "document" | "voice";
  createdAt: string;
  completedAt?: string;
}

export type ViewId = "today" | "archive" | "clocktower" | "crypt" | "keeper";
