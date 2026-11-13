import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, compareDateOnly, daysInMonth, makeDateOnly, parseDateOnly, weekdayOf } from "@/lib/domain/dates";
import { recurrenceRuleSchema, type RecurrenceRule } from "@/lib/domain/schema";
import { generateOccurrences, iterateOccurrences, nextOccurrenceAfter, upcomingOccurrences } from "@/lib/recurrence/generate";

const FAR = "2100-01-01";
const take = (rule: RecurrenceRule, start: string, count: number) => upcomingOccurrences(rule, start, start, count);

describe("rule validation", () => {
  it("accepts supported rules and rejects invalid ones", () => {
    expect(recurrenceRuleSchema.safeParse({ frequency: "monthly", interval: 1 }).success).toBe(true);
    expect(recurrenceRuleSchema.safeParse({ frequency: "monthly", interval: 0 }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ frequency: "monthly", interval: 100 }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ frequency: "monthly", interval: 1, weekdays: [1] }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ frequency: "weekly", interval: 1, dayOfMonth: 3 }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ frequency: "weekly", interval: 1, weekdays: [7] }).success).toBe(false);
    expect(recurrenceRuleSchema.safeParse({ frequency: "daily", interval: 1, startDate: "2026-02-02", endDate: "2026-02-01" }).success).toBe(false);
  });
});

describe("daily and weekly", () => {
  it("steps by calendar days across month and year ends", () => {
    expect(take({ frequency: "daily", interval: 3 }, "2026-12-30", 3)).toEqual(["2026-12-30", "2027-01-02", "2027-01-05"]);
  });
  it("weekly and fortnightly keep the weekday", () => {
    expect(take({ frequency: "weekly", interval: 1 }, "2026-11-25", 3)).toEqual(["2026-11-25", "2026-12-02", "2026-12-09"]);
    expect(take({ frequency: "weekly", interval: 2 }, "2026-11-25", 3)).toEqual(["2026-11-25", "2026-12-09", "2026-12-23"]);
  });
  it("weekly with weekdays starts at or after the start date", () => {
    // 2026-11-18 is a Wednesday. Monday of that week (16th) is before the start and is skipped.
    expect(weekdayOf("2026-11-18")).toBe(3);
    expect(take({ frequency: "weekly", interval: 1, weekdays: [1, 3] }, "2026-11-18", 4)).toEqual(["2026-11-18", "2026-11-23", "2026-11-25", "2026-11-30"]);
    expect(take({ frequency: "weekly", interval: 2, weekdays: [1, 3] }, "2026-11-18", 4)).toEqual(["2026-11-18", "2026-11-30", "2026-12-02", "2026-12-14"]);
  });
});

describe("month-end policy", () => {
  it("clamps to the last day but returns to the anchor day (no drift)", () => {
    expect(take({ frequency: "monthly", interval: 1 }, "2027-01-31", 5)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]);
  });
  it("uses 29 February in leap years", () => {
    expect(take({ frequency: "monthly", interval: 1 }, "2028-01-31", 2)[1]).toBe("2028-02-29");
  });
  it("honours dayOfMonth when the start was already clamped", () => {
    expect(take({ frequency: "monthly", interval: 1, dayOfMonth: 31 }, "2026-11-28", 3)).toEqual(["2026-11-28", "2026-12-31", "2027-01-31"]);
  });
  it("handles intervals and quarters", () => {
    expect(take({ frequency: "monthly", interval: 2 }, "2026-12-31", 3)).toEqual(["2026-12-31", "2027-02-28", "2027-04-30"]);
    expect(take({ frequency: "quarterly", interval: 1 }, "2026-11-30", 4)).toEqual(["2026-11-30", "2027-02-28", "2027-05-30", "2027-08-30"]);
  });
  it("rolls over the year", () => {
    expect(take({ frequency: "monthly", interval: 1 }, "2026-11-25", 3)).toEqual(["2026-11-25", "2026-12-25", "2027-01-25"]);
  });
});

describe("yearly and leap years", () => {
  it("moves 29 February to 28 February in non-leap years and back in leap years", () => {
    expect(take({ frequency: "yearly", interval: 1 }, "2028-02-29", 5)).toEqual(["2028-02-29", "2029-02-28", "2030-02-28", "2031-02-28", "2032-02-29"]);
  });
  it("keeps a plain annual date", () => {
    expect(take({ frequency: "yearly", interval: 1 }, "2027-03-18", 3)).toEqual(["2027-03-18", "2028-03-18", "2029-03-18"]);
  });
});

describe("bounds and lookups", () => {
  const rule: RecurrenceRule = { frequency: "monthly", interval: 1, endDate: "2027-02-25" };
  it("never goes past the end date", () => {
    expect([...iterateOccurrences(rule, "2026-11-25")]).toEqual(["2026-11-25", "2026-12-25", "2027-01-25", "2027-02-25"]);
  });
  it("windows are inclusive and exclude earlier dates", () => {
    expect(generateOccurrences({ frequency: "monthly", interval: 1 }, "2026-11-25", { from: "2026-12-25", to: "2027-02-25" })).toEqual(["2026-12-25", "2027-01-25", "2027-02-25"]);
  });
  it("finds the next occurrence strictly after a date, or none at the end", () => {
    expect(nextOccurrenceAfter(rule, "2026-11-25", "2026-11-25")).toBe("2026-12-25");
    expect(nextOccurrenceAfter(rule, "2026-11-25", "2027-02-25")).toBeUndefined();
  });
});

const arbStart = fc.record({ y: fc.integer({ min: 2000, max: 2060 }), m: fc.integer({ min: 1, max: 12 }), d: fc.integer({ min: 1, max: 31 }) })
  .map(({ y, m, d }) => makeDateOnly(y, m, Math.min(d, daysInMonth(y, m))));
const arbRule: fc.Arbitrary<RecurrenceRule> = fc.oneof(
  fc.record({ frequency: fc.constantFrom("daily" as const, "monthly" as const, "quarterly" as const, "yearly" as const), interval: fc.integer({ min: 1, max: 12 }) }),
  fc.record({ frequency: fc.constant("weekly" as const), interval: fc.integer({ min: 1, max: 4 }), weekdays: fc.option(fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }), { nil: undefined }) }),
);

describe("generation invariants (property tests)", () => {
  it("is strictly increasing, unique, starts at the start date and stays in bounds", () => {
    fc.assert(
      fc.property(arbRule, arbStart, fc.integer({ min: 0, max: 800 }), (rule, start, endOffset) => {
        const bounded = { ...rule, endDate: addDays(start, endOffset) };
        const dates = upcomingOccurrences(bounded, start, start, 60);
        const unique = new Set(dates);
        expect(unique.size).toBe(dates.length);
        for (let i = 0; i < dates.length; i++) {
          expect(compareDateOnly(dates[i], start)).toBeGreaterThanOrEqual(0);
          expect(compareDateOnly(dates[i], bounded.endDate)).toBeLessThanOrEqual(0);
          if (i > 0) expect(compareDateOnly(dates[i], dates[i - 1])).toBe(1);
        }
        if (!(rule.frequency === "weekly" && rule.weekdays) && dates.length > 0) expect(dates[0]).toBe(start);
      }),
      { numRuns: 300 },
    );
  });

  it("is idempotent and window results are a slice of the full series", () => {
    fc.assert(
      fc.property(arbRule, arbStart, fc.integer({ min: 0, max: 400 }), fc.integer({ min: 0, max: 400 }), (rule, start, a, b) => {
        const window = { from: addDays(start, Math.min(a, b)), to: addDays(start, Math.max(a, b) + 30) };
        const first = generateOccurrences(rule, start, window);
        expect(generateOccurrences(rule, start, window)).toEqual(first);
        const all = generateOccurrences(rule, start, { from: start, to: window.to });
        expect(all.filter((d) => compareDateOnly(d, window.from) >= 0)).toEqual(first);
      }),
      { numRuns: 200 },
    );
  });

  it("monthly occurrences fall on min(anchor day, days in month) and never drift", () => {
    fc.assert(
      fc.property(arbStart, fc.integer({ min: 1, max: 6 }), (start, interval) => {
        const anchor = parseDateOnly(start).day;
        for (const date of upcomingOccurrences({ frequency: "monthly", interval }, start, start, 40).slice(1)) {
          const { year, month, day } = parseDateOnly(date);
          expect(day).toBe(Math.min(anchor, daysInMonth(year, month)));
        }
      }),
      { numRuns: 200 },
    );
  });

  it("yearly occurrences keep the month and clamp only 29 February", () => {
    fc.assert(
      fc.property(arbStart, (start) => {
        const s = parseDateOnly(start);
        for (const date of upcomingOccurrences({ frequency: "yearly", interval: 1 }, start, start, 12).slice(1)) {
          const o = parseDateOnly(date);
          expect(o.month).toBe(s.month);
          expect(o.day).toBe(Math.min(s.day, daysInMonth(o.year, o.month)));
        }
      }),
      { numRuns: 200 },
    );
  });

  it("never exceeds the safety limit on unbounded series", () => {
    expect(generateOccurrences({ frequency: "daily", interval: 1 }, "2026-01-01", { from: "2026-01-01", to: FAR }, 25)).toHaveLength(25);
  });
});
