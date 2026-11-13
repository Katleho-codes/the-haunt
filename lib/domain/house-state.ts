import { diffDays, type DateOnly } from "@/lib/domain/dates";
import type { Commitment } from "@/lib/domain/schema";

/**
 * The mood of the house is a plain function of the user's active commitments. No AI, no scoring of the user.
 *
 * - restless: at least one active commitment is overdue
 * - watchful: nothing overdue, and three or more are due today or within the next seven days
 * - calm: nothing overdue, and fewer than three are due soon
 *
 * The wording is calm on purpose. Overdue items are "restless", never the user's failure.
 */
export type HouseState = "calm" | "watchful" | "restless";

export const WATCHFUL_THRESHOLD = 3;
export const SOON_DAYS = 7;

export interface HouseMood {
  state: HouseState;
  overdue: number;
  dueSoon: number;
  label: string;
  description: string;
}

export function computeHouseState(commitments: readonly Commitment[], today: DateOnly): HouseMood {
  let overdue = 0;
  let dueSoon = 0;
  for (const item of commitments) {
    if (item.status !== "active") continue;
    const delta = diffDays(item.dueDate, today);
    if (delta < 0) overdue += 1;
    else if (delta <= SOON_DAYS) dueSoon += 1;
  }
  if (overdue > 0) {
    return {
      state: "restless", overdue, dueSoon, label: "RESTLESS",
      description: overdue === 1 ? "One commitment is waiting to be laid to rest." : `${overdue} commitments are waiting to be laid to rest.`,
    };
  }
  if (dueSoon >= WATCHFUL_THRESHOLD) {
    return { state: "watchful", overdue, dueSoon, label: "WATCHFUL", description: `${dueSoon} commitments are approaching this week.` };
  }
  return { state: "calm", overdue, dueSoon, label: "CALM", description: "Nothing is overdue. The house is quiet." };
}
