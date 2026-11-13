/**
 * Date-only helpers. A DateOnly is a calendar date ("YYYY-MM-DD") with no time
 * and no timezone, so it can never shift to a neighbouring day when formatted.
 */
export type DateOnly = string;
export type LocalTime = string;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-12
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidDateOnly(value: string): value is DateOnly {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function isValidLocalTime(value: string): value is LocalTime {
  return LOCAL_TIME.test(value);
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function makeDateOnly(year: number, month: number, day: number): DateOnly {
  const text = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!isValidDateOnly(text)) throw new RangeError(`Invalid calendar date: ${text}`);
  return text;
}

export function parseDateOnly(value: DateOnly): { year: number; month: number; day: number } {
  if (!isValidDateOnly(value)) throw new RangeError(`Invalid calendar date: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): DateOnly {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function toDayNumber(value: DateOnly): number {
  const { year, month, day } = parseDateOnly(value);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function compareDateOnly(a: DateOnly, b: DateOnly): number {
  return a < b ? -1 : a > b ? 1 : 0; // ISO dates sort lexicographically
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function diffDays(to: DateOnly, from: DateOnly): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const { year, month, day } = parseDateOnly(value);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return makeDateOnly(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** Format a calendar date for display. The same day is shown in every timezone. */
export function formatDateOnly(
  value: DateOnly,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const { year, month, day } = parseDateOnly(value);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
