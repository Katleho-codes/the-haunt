import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays, makeDateOnly } from "@/lib/domain/dates";
import { instantToZoned, zonedDateTimeToInstant } from "@/lib/recurrence/zoned";

const iso = (d: Date) => d.toISOString();

describe("zoned conversion", () => {
  it("converts a plain wall time (no DST in Johannesburg)", () => {
    expect(iso(zonedDateTimeToInstant("2026-11-25", "09:00", "Africa/Johannesburg"))).toBe("2026-11-25T07:00:00.000Z");
  });
  it("moves a non-existent spring-forward time forward (London, New York)", () => {
    const london = zonedDateTimeToInstant("2027-03-28", "01:30", "Europe/London");
    expect(instantToZoned(london, "Europe/London")).toEqual({ date: "2027-03-28", time: "02:30" });
    const ny = zonedDateTimeToInstant("2027-03-14", "02:30", "America/New_York");
    expect(iso(ny)).toBe("2027-03-14T07:30:00.000Z");
    expect(instantToZoned(ny, "America/New_York").time).toBe("03:30");
  });
  it("uses the first instant when a fall-back time happens twice", () => {
    expect(iso(zonedDateTimeToInstant("2026-10-25", "01:30", "Europe/London"))).toBe("2026-10-25T00:30:00.000Z");
    expect(iso(zonedDateTimeToInstant("2026-11-01", "01:30", "America/New_York"))).toBe("2026-11-01T05:30:00.000Z");
  });
  it("property: a valid wall time round-trips and the local date never changes", () => {
    const zones = ["Africa/Johannesburg", "Europe/London", "America/New_York", "Australia/Sydney", "Asia/Kolkata"];
    fc.assert(
      fc.property(fc.constantFrom(...zones), fc.integer({ min: 0, max: 700 }), (zone, offset) => {
        const date = addDays(makeDateOnly(2026, 6, 1), offset);
        const result = zonedDateTimeToInstant(date, "12:00", zone); // noon is never inside a DST transition
        expect(instantToZoned(result, zone)).toEqual({ date, time: "12:00" });
      }),
      { numRuns: 150 },
    );
  });
});
