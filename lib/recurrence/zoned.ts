import { parseDateOnly, type DateOnly, type LocalTime } from "@/lib/domain/dates";

/**
 * Convert a wall-clock date and time in an IANA timezone to a UTC instant.
 * DST policy (tested):
 * - Gap (the local time does not exist, e.g. 02:30 on a spring-forward day): moves forward by the gap.
 * - Overlap (the local time happens twice): the first (earlier) instant is used.
 */

function localPartsAt(instantMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Offset of the zone from UTC at an instant, in milliseconds (positive east of UTC). */
function offsetAt(instantMs: number, timeZone: string): number {
  const p = localPartsAt(instantMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

export function zonedDateTimeToInstant(date: DateOnly, time: LocalTime, timeZone: string): Date {
  const { year, month, day } = parseDateOnly(date);
  const [hour, minute] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const DAY = 86_400_000;
  const offsetBefore = offsetAt(wallAsUtc - DAY, timeZone);
  const offsetAfter = offsetAt(wallAsUtc + DAY, timeZone);

  const matchesWall = (instant: number) => {
    const p = localPartsAt(instant, timeZone);
    return p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute;
  };
  const candidates = [...new Set([wallAsUtc - offsetBefore, wallAsUtc - offsetAfter])].filter(matchesWall).sort((a, b) => a - b);
  if (candidates.length > 0) return new Date(candidates[0]); // overlap: earliest
  return new Date(wallAsUtc - offsetBefore); // gap: apply the pre-transition offset, landing after the gap
}

/** The wall-clock date and time of an instant in a zone, as strings. */
export function instantToZoned(instant: Date, timeZone: string): { date: DateOnly; time: LocalTime } {
  const p = localPartsAt(instant.getTime(), timeZone);
  const two = (n: number) => String(n).padStart(2, "0");
  return { date: `${String(p.year).padStart(4, "0")}-${two(p.month)}-${two(p.day)}`, time: `${two(p.hour)}:${two(p.minute)}` };
}
