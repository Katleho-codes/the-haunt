import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addDays, compareDateOnly, diffDays, formatDateOnly, isValidDateOnly, isValidTimeZone, makeDateOnly, todayIn,
} from "@/lib/domain/dates";

describe("date-only validation", () => {
  it("accepts real dates including leap days", () => {
    expect(isValidDateOnly("2028-02-29")).toBe(true);
    expect(isValidDateOnly("2026-11-25")).toBe(true);
  });
  it("rejects impossible or malformed dates", () => {
    for (const bad of ["2027-02-29", "2026-13-01", "2026-00-10", "2026-04-31", "2026-1-1", "26-01-01", "", "2026-11-25T00:00:00Z"]) {
      expect(isValidDateOnly(bad), bad).toBe(false);
    }
  });
  it("validates timezones", () => {
    expect(isValidTimeZone("Africa/Johannesburg")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("date-only arithmetic", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("counts whole days regardless of DST in any zone", () => {
    expect(diffDays("2026-03-30", "2026-03-27")).toBe(3);
    expect(diffDays("2026-10-26", "2026-10-24")).toBe(2);
  });
  it("property: addDays then diffDays round-trips", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1950, max: 2100 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), fc.integer({ min: -4000, max: 4000 }),
        (y, m, d, n) => {
          const start = makeDateOnly(y, m, d);
          const end = addDays(start, n);
          expect(isValidDateOnly(end)).toBe(true);
          expect(diffDays(end, start)).toBe(n);
          expect(compareDateOnly(end, start)).toBe(Math.sign(n));
        },
      ),
    );
  });
});

describe("timezone-aware today and display", () => {
  it("returns different calendar days for the same instant in different zones", () => {
    const instant = new Date("2026-11-24T23:30:00Z"); // 01:30 on 25 Nov in Johannesburg
    expect(todayIn("Africa/Johannesburg", instant)).toBe("2026-11-25");
    expect(todayIn("UTC", instant)).toBe("2026-11-24");
    expect(todayIn("America/New_York", instant)).toBe("2026-11-24");
  });
  it("shows the same calendar day in every process timezone", () => {
    const shown = formatDateOnly("2026-11-25", "en-ZA", { day: "numeric", month: "numeric", year: "numeric" });
    expect(shown).toContain("25");
    expect(shown).toContain("11");
  });
});
