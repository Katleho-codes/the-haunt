import {
  addDays, compareDateOnly, daysInMonth, makeDateOnly, parseDateOnly, weekdayOf, type DateOnly,
} from "@/lib/domain/dates";
import type { RecurrenceRule } from "@/lib/domain/schema";

/**
 * Calendar recurrence. All arithmetic is on calendar dates, never on milliseconds.
 *
 * Policies (tested):
 * - Occurrence n is computed from the series start, not from occurrence n-1, so a clamped
 *   month (31 Jan -> 28 Feb) does not drift later months (31 Mar stays on the 31st).
 * - Month-end: when the target day does not exist, the last day of that month is used.
 * - Yearly from 29 Feb: 28 Feb in non-leap years, 29 Feb in leap years.
 * - The first occurrence is always the start date itself.
 * - Weekly rules with weekdays use weeks that begin on Sunday, anchored on the start date's week.
 */

const SAFETY_LIMIT = 20_000;

function addMonths(start: DateOnly, months: number, day: number): DateOnly {
  const { year, month } = parseDateOnly(start);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return makeDateOnly(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** Lazily yields occurrences in strictly increasing order, starting at `start`. */
export function* iterateOccurrences(rule: RecurrenceRule, start: DateOnly): Generator<DateOnly> {
  const { day: startDay } = parseDateOnly(start);
  const { interval } = rule;
  const end = rule.endDate;
  const within = (date: DateOnly) => end === undefined || compareDateOnly(date, end) <= 0;

  if (rule.frequency === "weekly" && rule.weekdays && rule.weekdays.length > 0) {
    const weekdays = [...new Set(rule.weekdays)].sort((a, b) => a - b);
    const weekStart = addDays(start, -weekdayOf(start));
    for (let week = 0; week < SAFETY_LIMIT; week++) {
      const base = addDays(weekStart, 7 * interval * week);
      for (const weekday of weekdays) {
        const date = addDays(base, weekday);
        if (compareDateOnly(date, start) < 0) continue;
        if (!within(date)) return;
        yield date;
      }
    }
    return;
  }

  for (let n = 0; n < SAFETY_LIMIT; n++) {
    let date: DateOnly;
    if (n === 0) {
      date = start;
    } else {
      switch (rule.frequency) {
        case "daily": date = addDays(start, n * interval); break;
        case "weekly": date = addDays(start, 7 * n * interval); break;
        case "monthly": date = addMonths(start, n * interval, rule.dayOfMonth ?? startDay); break;
        case "quarterly": date = addMonths(start, 3 * n * interval, rule.dayOfMonth ?? startDay); break;
        case "yearly": date = addMonths(start, 12 * n * interval, startDay); break;
      }
    }
    if (!within(date)) return;
    yield date;
  }
}

export interface DateWindow {
  from: DateOnly;
  to: DateOnly;
}

/** All occurrences within the inclusive window. Deterministic and idempotent. */
export function generateOccurrences(rule: RecurrenceRule, start: DateOnly, window: DateWindow, limit = 500): DateOnly[] {
  const result: DateOnly[] = [];
  for (const date of iterateOccurrences(rule, start)) {
    if (compareDateOnly(date, window.to) > 0) break;
    if (compareDateOnly(date, window.from) >= 0) result.push(date);
    if (result.length >= limit) break;
  }
  return result;
}

/** The first occurrence strictly after `after`, or undefined when the series has ended. */
export function nextOccurrenceAfter(rule: RecurrenceRule, start: DateOnly, after: DateOnly): DateOnly | undefined {
  for (const date of iterateOccurrences(rule, start)) {
    if (compareDateOnly(date, after) > 0) return date;
  }
  return undefined;
}

/** Up to `count` occurrences on or after `from`. */
export function upcomingOccurrences(rule: RecurrenceRule, start: DateOnly, from: DateOnly, count: number): DateOnly[] {
  const result: DateOnly[] = [];
  for (const date of iterateOccurrences(rule, start)) {
    if (compareDateOnly(date, from) < 0) continue;
    result.push(date);
    if (result.length >= count) break;
  }
  return result;
}
