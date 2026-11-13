import {
  addDays, compareDateOnly, daysInMonth, isValidDateOnly, makeDateOnly, parseDateOnly, weekdayOf, type DateOnly,
} from "@/lib/domain/dates";
import { toMinor } from "@/lib/domain/money";
import type { CommitmentType } from "@/lib/domain/schema";

/**
 * Small extractors for the deterministic reader. Each returns a value only when the text supports it.
 * None of them guesses: unknown means undefined, and the caller records what needs review.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH_NAMES = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WORD_NUMBERS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, other: 2 };

// ---------- amounts ----------

export interface AmountMatch { amountMinor: number; currency: string; assumed?: string }

const NUMBER = String.raw`\d{1,3}(?:[ ,]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;
const MARKERS: Record<string, { currency: string; assumed?: string }> = {
  r: { currency: "ZAR" }, rand: { currency: "ZAR" }, rands: { currency: "ZAR" }, zar: { currency: "ZAR" },
  usd: { currency: "USD" }, $: { currency: "USD", assumed: "A dollar sign was read as USD." }, dollar: { currency: "USD", assumed: "Dollars were read as USD." }, dollars: { currency: "USD", assumed: "Dollars were read as USD." },
  eur: { currency: "EUR" }, "€": { currency: "EUR" }, euro: { currency: "EUR" }, euros: { currency: "EUR" },
  gbp: { currency: "GBP" }, "£": { currency: "GBP" }, pound: { currency: "GBP" }, pounds: { currency: "GBP" },
};

/**
 * Amounts need a currency marker (R, ZAR, $, USD, €, £, "rand", ...). A bare number is never an amount:
 * "for 3 weeks" and "the 25th" contain no amount. The marker must not sit inside a word ("for 3").
 */
export function extractAmounts(text: string): AmountMatch[] {
  const found: AmountMatch[] = [];
  const before = new RegExp(String.raw`(?<![A-Za-z0-9])(R|ZAR|USD|EUR|GBP|\$|€|£)\s?(${NUMBER})(?![\d])`, "gi");
  const after = new RegExp(String.raw`(?<![\d.,])(${NUMBER})\s?(rands?|ZAR|USD|EUR|GBP|dollars?|euros?|pounds?)\b`, "gi");
  const add = (number: string, marker: string) => {
    const info = MARKERS[marker.toLowerCase()];
    if (!info) return;
    const major = Number(number.replace(/[ ,]/g, ""));
    if (!Number.isFinite(major)) return;
    found.push({ amountMinor: toMinor(major, info.currency), currency: info.currency, assumed: info.assumed });
  };
  for (const match of text.matchAll(before)) add(match[2], match[1]);
  for (const match of text.matchAll(after)) add(match[1], match[2]);
  const seen = new Set<string>();
  return found.filter((item) => {
    const key = `${item.currency}:${item.amountMinor}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------- recurrence ----------

export interface RecurrenceMatch {
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  interval: number;
  weekdays?: number[];
}

function toInterval(value: string): number {
  return WORD_NUMBERS[value] ?? Number(value);
}

export function extractRecurrence(text: string): RecurrenceMatch | undefined {
  const lower = text.toLowerCase();
  const weekday = lower.match(/\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekday) return { frequency: "weekly", interval: 1, weekdays: [WEEKDAYS.indexOf(weekday[1])] };
  if (/\b(fortnightly|every other week)\b/.test(lower)) return { frequency: "weekly", interval: 2 };
  const every = lower.match(/\bevery\s+(\d{1,2}|two|three|four|five|six)\s+(day|week|month|year)s?\b/);
  if (every) {
    const interval = toInterval(every[1]);
    if (interval >= 1 && interval <= 99) {
      if (every[2] === "month" && interval === 3) return { frequency: "quarterly", interval: 1 };
      const frequency = ({ day: "daily", week: "weekly", month: "monthly", year: "yearly" } as const)[every[2] as "day"];
      return { frequency, interval };
    }
  }
  if (/\b(quarterly|every quarter)\b/.test(lower)) return { frequency: "quarterly", interval: 1 };
  if (/\b(annually|annual|yearly|every year|each year|per year|once a year)\b/.test(lower)) return { frequency: "yearly", interval: 1 };
  if (/\b(monthly|every month|each month|per month|once a month)\b|\/\s?month\b/.test(lower)) return { frequency: "monthly", interval: 1 };
  if (/\b(weekly|every week|each week|per week)\b/.test(lower)) return { frequency: "weekly", interval: 1 };
  if (/\b(daily|every day|each day)\b/.test(lower)) return { frequency: "daily", interval: 1 };
  return undefined;
}

// ---------- dates ----------

export type DateExtraction =
  | { kind: "none" }
  | { kind: "partial"; note: string }
  | { kind: "invalid"; note: string }
  | { kind: "exact"; date: DateOnly }
  | { kind: "derived"; date: DateOnly; note: string; dayOfMonth?: number };

function monthNumber(name: string): number | undefined {
  return MONTHS[name.toLowerCase()] ?? MONTHS[name.toLowerCase().slice(0, 3)];
}

/** First date on or after `today` whose day-of-month is `day`. With `clamp`, short months use their last day. */
export function nextDayOfMonth(today: DateOnly, day: number, clamp: boolean): DateOnly | undefined {
  const start = parseDateOnly(today);
  let { year, month } = start;
  for (let i = 0; i < 26; i++) {
    const length = daysInMonth(year, month);
    if (day <= length || clamp) {
      const date = makeDateOnly(year, month, Math.min(day, length));
      if (compareDateOnly(date, today) >= 0) return date;
    }
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return undefined;
}

export function extractDate(text: string, today: DateOnly, options: { recurring: boolean }): DateExtraction {
  const lower = text.toLowerCase();
  const { year: thisYear } = parseDateOnly(today);

  const iso = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const date = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    return isValidDateOnly(date) ? { kind: "exact", date } : { kind: "invalid", note: `"${iso[0]}" is not a real date.` };
  }
  const numeric = lower.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (numeric) {
    const date = `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`; // day first (en-ZA)
    return isValidDateOnly(date)
      ? { kind: "derived", date, note: `Read ${numeric[0]} as day/month/year.` }
      : { kind: "invalid", note: `"${numeric[0]}" is not a real day/month/year date.` };
  }

  const named = lower.match(new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(${MONTH_NAMES})\b(?:\s*,?\s*(20\d{2}))?`));
  const usNamed = named ? null : lower.match(new RegExp(String.raw`\b(${MONTH_NAMES})\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:\s*,?\s*(20\d{2}))?`));
  if (named || usNamed) {
    const day = Number(named ? named[1] : usNamed![2]);
    const month = monthNumber(named ? named[2] : usNamed![1])!;
    const explicitYear = named ? named[3] : usNamed![3];
    if (explicitYear) {
      const date = `${explicitYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return isValidDateOnly(date) ? { kind: "exact", date } : { kind: "invalid", note: "That day does not exist in that month." };
    }
    let year = thisYear;
    let date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!isValidDateOnly(date)) return { kind: "invalid", note: "That day does not exist in that month." };
    if (compareDateOnly(date, today) < 0) { year += 1; date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
    if (!isValidDateOnly(date)) return { kind: "invalid", note: "That day does not exist in that month." };
    return { kind: "derived", date, note: `The year was not stated; assumed ${year}.` };
  }

  if (/\btoday\b/.test(lower)) return { kind: "derived", date: today, note: 'Read "today" as the current date.' };
  if (/\btomorrow\b/.test(lower)) return { kind: "derived", date: addDays(today, 1), note: 'Read "tomorrow" as the next calendar day.' };
  const relative = lower.match(/\bin\s+(\d{1,3})\s+(day|week)s?\b/);
  if (relative) {
    const days = Number(relative[1]) * (relative[2] === "week" ? 7 : 1);
    return { kind: "derived", date: addDays(today, days), note: `Counted ${relative[1]} ${relative[2]}(s) from today.` };
  }
  const nextWeekday = lower.match(/\b(?:next|on)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextWeekday) {
    const target = WEEKDAYS.indexOf(nextWeekday[1]);
    const delta = (target - weekdayOf(today) + 7) % 7 || 7;
    return { kind: "derived", date: addDays(today, delta), note: `Read "${nextWeekday[1]}" as the next one after today.` };
  }

  const ordinal = lower.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
  if (ordinal) {
    const day = Number(ordinal[1]);
    if (day < 1 || day > 31) return { kind: "invalid", note: `"${ordinal[1]}" is not a day of the month.` };
    const date = nextDayOfMonth(today, day, options.recurring);
    if (!date) return { kind: "invalid", note: "No matching date was found." };
    const clamped = options.recurring && day > daysInMonth(parseDateOnly(date).year, parseDateOnly(date).month);
    return {
      kind: "derived",
      date,
      dayOfMonth: day,
      note: options.recurring
        ? `Only the day (the ${day}${ordinalSuffix(day)}) was given; the next one is shown. Confirm the next due date.${clamped || day > 28 ? ` Months without a ${day}${ordinalSuffix(day)} use their last day.` : ""}`
        : `Only the day (the ${day}${ordinalSuffix(day)}) was given; the next month with that day is shown. Confirm the month.`,
    };
  }

  // A month with no day: "expires in March", "by March 2027". A preposition is required so the verb "may" is not read as a month.
  const monthOnly = lower.match(new RegExp(String.raw`\b(?:in|by|before|during|until|on|for)\s+(${MONTH_NAMES})\b(?:\s+(20\d{2}))?`))
    ?? lower.match(new RegExp(String.raw`\b(${MONTH_NAMES})\s+(20\d{2})\b`));
  if (monthOnly) {
    const label = monthOnly[1].charAt(0).toUpperCase() + monthOnly[1].slice(1);
    return { kind: "partial", note: `Only the month (${label}${monthOnly[2] ? ` ${monthOnly[2]}` : ""}) was given. The exact day${monthOnly[2] ? " is" : " and year are"} needed.` };
  }  return { kind: "none" };
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  return ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
}

// ---------- type and title ----------

export function classify(text: string): { type: CommitmentType; matched: boolean } {
  const lower = text.toLowerCase();
  if (/\b(renew|renewal|licen[cs]e|expir\w*|registration|roadworthy)\b/.test(lower)) return { type: "renewal", matched: true };
  if (/\b(subscription|netflix|showmax|spotify|streaming|gym|membership|dstv)\b/.test(lower)) return { type: lower.includes("membership") ? "membership" : "subscription", matched: true };
  if (/\b(pay|payment|bill|fees?|invoice|rent|premium|instalment|installment|account|levy|levies)\b/.test(lower)) return { type: "bill", matched: true };
  if (/\b(appointment|dentist|doctor|check-?up|clinic|vet|optometrist|meeting|consultation)\b/.test(lower)) return { type: "appointment", matched: true };
  if (/\b(school|exam|assignment|tuition|homework|lecture)\b/.test(lower)) return { type: "study", matched: true };
  if (/\b(meter|clean|repair|maintenance|garage|service the|plumber|garden)\b/.test(lower)) return { type: "household", matched: true };
  if (/\b(report|client|boss|work|deadline|presentation)\b/.test(lower)) return { type: "work", matched: true };
  return { type: "task", matched: false };
}

const VERB_START = /^(renew|pay|book|call|buy|submit|send|check|review|sort|service|take|collect|drop|schedule|cancel|apply|register|file|update|pick|return|attend|visit|clean|fix|repair|order|email|pack|prepare|finish|complete)\b/i;
const FILLER = /^(?:please\s+)?(?:remind me to|remember to|don'?t forget to|i need to|i must|i have to|need to|have to|i should)\s+/i;
const ARTICLE = /^(?:my|the|our|a|an)\s+/i;
const DATE_CUE = String.raw`(?:the\s+)?(?:\d|R\s?\d|\$|€|£|(?:${MONTH_NAMES})\b|sunday|monday|tuesday|wednesday|thursday|friday|saturday|today|tomorrow|next|end\b|a\s+few\b)`;
const CUT = new RegExp(
  String.raw`\s+(?:(?:on|in|by|before|until|from|for|at|every|each)\s+(?=${DATE_CUE})|(?:is|are|was|will be|expires?|expiring|due|monthly|weekly|daily|annually|yearly|quarterly|fortnightly)\b|[,(]|(?:R|\$|€|£)\s?\d)`,
  "i",
);

export function inferTitle(text: string, type: CommitmentType): string {
  const firstClause = text.trim().split(/[;\n]|\.(?=\s|$)/)[0] ?? "";
  let working = firstClause.replace(FILLER, "").replace(ARTICLE, "").trim();
  const cut = working.search(CUT);
  if (cut > 0) working = working.slice(0, cut).trim();
  working = working.replace(/\s+/g, " ").replace(/[\s,.:-]+$/, "");
  if (!working) working = firstClause.trim().slice(0, 60);
  if (!working) return "";
  if (type === "renewal" && !VERB_START.test(working)) working = `Renew ${working}`;
  working = working.charAt(0).toUpperCase() + working.slice(1);
  return working.slice(0, 120);
}

/** Suggested reminder timing. Suggestions only; the user edits them in the review step. */
export function suggestReminders(type: CommitmentType): number[] {
  switch (type) {
    case "bill": case "subscription": case "membership": return [3];
    case "renewal": return [14, 1];
    case "appointment": return [1];
    default: return [];
  }
}
