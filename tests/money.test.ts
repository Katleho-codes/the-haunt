import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatMoney, fromMinor, sumByCurrency, toMinor } from "@/lib/domain/money";

describe("money", () => {
  it("converts major to minor units without float drift", () => {
    expect(toMinor(899, "ZAR")).toBe(89900);
    expect(toMinor(1250.5, "ZAR")).toBe(125050);
    expect(toMinor(0.1 + 0.2, "ZAR")).toBe(30);
    expect(toMinor(1.005, "ZAR")).toBe(101);
  });
  it("respects currencies with no minor unit", () => {
    expect(toMinor(500, "JPY")).toBe(500);
  });
  it("rejects negative and non-finite amounts", () => {
    expect(() => toMinor(-1, "ZAR")).toThrow();
    expect(() => toMinor(Number.NaN, "ZAR")).toThrow();
  });
  it("property: fromMinor(toMinor(x)) is within half a minor unit", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000 }), (minor) => {
        expect(toMinor(fromMinor(minor, "ZAR"), "ZAR")).toBe(minor);
      }),
    );
  });
  it("formats missing amounts as a dash", () => {
    expect(formatMoney(undefined, undefined)).toBe("—");
  });
});

describe("sumByCurrency", () => {
  it("never combines currencies and skips unknown amounts", () => {
    const totals = sumByCurrency([
      { amountMinor: 89900, currency: "ZAR" },
      { amountMinor: 9900, currency: "ZAR" },
      { amountMinor: 1500, currency: "USD" },
      {},
      { amountMinor: 500 },
    ]);
    expect(totals).toEqual([
      { currency: "USD", totalMinor: 1500, count: 1 },
      { currency: "ZAR", totalMinor: 99800, count: 2 },
    ]);
  });
  it("property: the sum of totals equals the sum of inputs per currency", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ amountMinor: fc.integer({ min: 0, max: 1_000_000 }), currency: fc.constantFrom("ZAR", "USD", "EUR") })),
        (items) => {
          const totals = sumByCurrency(items);
          for (const code of ["ZAR", "USD", "EUR"]) {
            const expected = items.filter((i) => i.currency === code).reduce((n, i) => n + i.amountMinor, 0);
            expect(totals.find((t) => t.currency === code)?.totalMinor ?? 0).toBe(expected);
          }
        },
      ),
    );
  });
});
