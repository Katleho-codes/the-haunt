import { describe, expect, it } from "vitest";
import { parseCapture } from "@/lib/capture";

// Migrated from scripts/capture.test.cjs. The parser still has known defects
// (see docs/IMPLEMENTATION-AUDIT.md section 5); they are fixed in intelligent-capture tasks 5.2-5.4.
describe("deterministic capture parser (prototype)", () => {
  it("extracts a South African monthly fibre payment", () => {
    const result = parseCapture("My fibre payment is due on the 25th every month. It is R899.");
    expect(result.category).toBe("subscription");
    expect(result.recurrence).toBe("monthly");
    expect(result.amount).toBe(899);
    expect(result.currency).toBe("ZAR");
    expect(result.confidence).toBe("high");
    expect(result.dueAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("extracts an explicit named date", () => {
    const result = parseCapture("Renew vehicle licence on 18 March 2027");
    expect(result.category).toBe("renewal");
    expect(result.dueAt?.slice(0, 10)).toBe("2027-03-18");
    expect(result.confidence).toBe("medium");
  });

  it("extracts a relative date and decimal amount", () => {
    const result = parseCapture("Pay the electricity bill in 3 days for R1,250.50");
    expect(new Date(result.dueAt as string).getDate()).toBe(new Date(Date.now() + 3 * 86_400_000).getDate());
    expect(result.amount).toBe(1250.5);
    expect(result.category).toBe("payment");
  });

  it("does not claim confidence when no date can be found", () => {
    const result = parseCapture("Remember to sort out the garage");
    expect(result.confidence).toBe("low");
    expect(result.recurrence).toBe("none");
    expect(result.amount).toBeNull();
    expect(result.dueAt).toBeNull();
  });
});
