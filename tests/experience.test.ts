import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { GAIN_CEILING, MAX_VOLUME, ambienceGain, effectGain } from "@/lib/audio/levels";
import { SOON_DAYS, WATCHFUL_THRESHOLD, computeHouseState } from "@/lib/domain/house-state";
import { shouldReduceMotion } from "@/lib/domain/motion";
import { settingsSchema } from "@/lib/domain/schema";
import { makeCommitment, NOW_ISO } from "./fixtures";

const today = "2026-11-13";
const due = (id: string, dueDate: string, over = {}) => makeCommitment({ id, dueDate, ...over });

describe("computeHouseState", () => {
  it("is calm with nothing or little due", () => {
    expect(computeHouseState([], today).state).toBe("calm");
    expect(computeHouseState([due("a", "2026-11-20"), due("b", "2026-11-14")], today).state).toBe("calm");
    expect(computeHouseState([due("far", "2027-01-01")], today).state).toBe("calm");
  });
  it("is watchful at exactly the threshold of items due within seven days, none overdue", () => {
    const items = [due("a", "2026-11-13"), due("b", "2026-11-16"), due("c", "2026-11-20")];
    expect(items).toHaveLength(WATCHFUL_THRESHOLD);
    const mood = computeHouseState(items, today);
    expect(mood).toMatchObject({ state: "watchful", dueSoon: 3, overdue: 0 });
    expect(computeHouseState([...items.slice(0, 2), due("late-week", "2026-11-21")], today).state).toBe("calm"); // day 8 is not "soon"
    expect(SOON_DAYS).toBe(7);
  });
  it("is restless as soon as one active item is overdue, whatever else is due", () => {
    const mood = computeHouseState([due("a", "2026-11-12"), due("b", "2026-11-14"), due("c", "2026-11-15"), due("d", "2026-11-16")], today);
    expect(mood).toMatchObject({ state: "restless", overdue: 1 });
    expect(mood.description).toMatch(/laid to rest/);
  });
  it("ignores completed and archived commitments", () => {
    const done = due("a", "2026-11-01", { status: "completed", completedAt: NOW_ISO });
    const archived = due("b", "2026-11-01", { status: "archived" });
    expect(computeHouseState([done, archived], today).state).toBe("calm");
  });
  it("uses the supplied calendar day, not the machine clock", () => {
    const item = due("a", "2026-11-13");
    expect(computeHouseState([item], "2026-11-13").overdue).toBe(0);
    expect(computeHouseState([item], "2026-11-14").state).toBe("restless");
  });
  it("never uses shaming wording", () => {
    for (const items of [[], [due("a", "2026-11-01")], [due("a", "2026-11-13"), due("b", "2026-11-14"), due("c", "2026-11-15")]]) {
      const mood = computeHouseState(items, today);
      expect(`${mood.label} ${mood.description}`).not.toMatch(/fail|late|bad|behind|lazy|ignored/i);
    }
  });
  it("property: overdue count is exact and any overdue item means restless", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -10, max: 20 }), { maxLength: 15 }), (offsets) => {
        const items = offsets.map((n, i) => due(`i${i}`, new Date(Date.UTC(2026, 10, 13 + n)).toISOString().slice(0, 10)));
        const mood = computeHouseState(items, today);
        const expectedOverdue = offsets.filter((n) => n < 0).length;
        expect(mood.overdue).toBe(expectedOverdue);
        expect(mood.state === "restless").toBe(expectedOverdue > 0);
      }),
    );
  });
});

describe("sound levels", () => {
  it("never exceed the ceiling, for any setting or bad data", () => {
    fc.assert(
      fc.property(fc.oneof(fc.double({ noNaN: false }), fc.constantFrom(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, 5, -3)), (volume) => {
        for (const gain of [ambienceGain(volume), effectGain(volume)]) {
          expect(gain).toBeGreaterThan(0);
          expect(gain).toBeLessThanOrEqual(GAIN_CEILING);
        }
      }),
    );
  });
  it("grow with the slider and are quiet at the default", () => {
    expect(ambienceGain(0.5)).toBeGreaterThan(ambienceGain(0.1));
    expect(ambienceGain(0.24)).toBeCloseTo(0.024, 5);
    expect(effectGain(MAX_VOLUME)).toBeLessThan(0.03);
  });
});

describe("motion preference", () => {
  it("system follows the device; explicit choices override it", () => {
    expect(shouldReduceMotion("system", true)).toBe(true);
    expect(shouldReduceMotion("system", false)).toBe(false);
    expect(shouldReduceMotion("reduced", false)).toBe(true);
    expect(shouldReduceMotion("full", true)).toBe(false);
  });
});

describe("settings defaults and migration", () => {
  it("starts with sound off, motion following the system, and full atmosphere", () => {
    expect(settingsSchema.parse({})).toMatchObject({ ambience: false, effects: false, motion: "system", intensity: "full" });
  });
  it("keeps an old reduced-motion choice", () => {
    expect(settingsSchema.parse({ reduceMotion: true }).motion).toBe("reduced");
    expect(settingsSchema.parse({ reduceMotion: false }).motion).toBe("system");
    expect(settingsSchema.parse({ reduceMotion: true, motion: "full" }).motion).toBe("full");
  });
  it("rejects unknown motion values", () => {
    expect(settingsSchema.safeParse({ motion: "sometimes" }).success).toBe(false);
  });
});
