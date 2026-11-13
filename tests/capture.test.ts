import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { commitmentProposalSchema, reviewNotes, type CommitmentProposal } from "@/lib/capture/proposal";
import { parseCapture } from "@/lib/capture/deterministic-parser";
import { extractAmounts, extractDate, extractRecurrence } from "@/lib/capture/extract";
import { proposalToReview, repeatFromRule } from "@/lib/capture/review";
import { draftToCommitment } from "@/lib/domain/draft";

const TZ = "Africa/Johannesburg";
// Fixed clock: Friday 13 November 2026, mid-morning in Johannesburg.
const ctx = { now: new Date("2026-11-13T08:00:00+02:00"), timezone: TZ };
const parse = (text: string) => parseCapture(text, ctx);
const reviewedFields = (p: CommitmentProposal) => Object.keys(reviewNotes(p));

describe("brief examples", () => {
  it("fibre bill: R899 due on the 25th of every month", () => {
    const p = parse("My fibre bill is R899 and is due on the 25th of every month.");
    expect(p).toMatchObject({ title: "Fibre bill", type: "bill", amountMinor: 89900, currency: "ZAR", dueDate: "2026-11-25", parser: "deterministic" });
    expect(p.recurrence).toEqual({ frequency: "monthly", interval: 1, dayOfMonth: 25 });
    expect(p.reminderSuggestions).toEqual([{ offsetMinutes: 4320, channel: "in_app" }]);
    expect(reviewedFields(p)).toContain("dueDate"); // the next date was worked out, not stated
    expect(reviewNotes(p).dueDate).toMatch(/Confirm the next due date/);
  });
  it("vehicle licence expiring in March: no date is invented", () => {
    const p = parse("The vehicle licence expires in March; remind me before it expires.");
    expect(p.title).toBe("Renew vehicle licence");
    expect(p.type).toBe("renewal");
    expect(p.dueDate).toBeUndefined();
    expect(reviewNotes(p).dueDate).toMatch(/Only the month \(March\)/);
    expect(commitmentProposalSchema.safeParse(p).success).toBe(true);
  });
});

describe("regression: defects found in the audit", () => {
  it("'for 3 weeks' is not an amount", () => {
    const p = parse("Dentist for 3 weeks, call before 5pm");
    expect(p.amountMinor).toBeUndefined();
    expect(p.currency).toBeUndefined();
    expect(p.title).toBe("Dentist");
    expect(p.type).toBe("appointment");
  });
  it("'the 31st every month' keeps day 31 and does not become the 28th", () => {
    const p = parse("Pay rent on the 31st every month");
    expect(p.recurrence).toEqual({ frequency: "monthly", interval: 1, dayOfMonth: 31 });
    expect(p.dueDate).toBe("2026-11-30"); // November has 30 days: last day of the month, day 31 preserved on the rule
    expect(reviewNotes(p).dueDate).toMatch(/last day/);
  });
  it("a bare day of month with no repeat picks the next month that has it", () => {
    const p = parse("Submit the form on the 31st");
    expect(p.dueDate).toBe("2026-12-31");
    expect(p.recurrence).toBeUndefined();
    expect(reviewNotes(p).dueDate).toMatch(/Confirm the month/);
  });
});

describe("dates", () => {
  const today = "2026-11-13";
  it("reads explicit dates without a review flag", () => {
    expect(parse("Renew vehicle licence on 18 March 2027")).toMatchObject({ title: "Renew vehicle licence", type: "renewal", dueDate: "2027-03-18" });
    expect(reviewedFields(parse("Renew vehicle licence on 18 March 2027"))).not.toContain("dueDate");
    expect(extractDate("due 2027-02-01", today, { recurring: false })).toEqual({ kind: "exact", date: "2027-02-01" });
  });
  it("flags an assumed year and rolls past dates to next year", () => {
    const later = extractDate("25 November", today, { recurring: false });
    const earlier = extractDate("3 March", today, { recurring: false });
    expect(later).toMatchObject({ kind: "derived", date: "2026-11-25" });
    expect(earlier).toMatchObject({ kind: "derived", date: "2027-03-03" });
    expect(earlier.kind === "derived" && earlier.note).toMatch(/assumed 2027/);
  });
  it("rejects impossible dates instead of fixing them", () => {
    expect(extractDate("30 February 2027", today, { recurring: false }).kind).toBe("invalid");
    expect(extractDate("31/04/2027", today, { recurring: false }).kind).toBe("invalid");
    expect(parse("Pay on 30 February 2027").dueDate).toBeUndefined();
  });
  it("reads relative dates in the user's timezone", () => {
    expect(parse("Call the bank tomorrow").dueDate).toBe("2026-11-14");
    expect(parse("Pay the electricity bill in 3 days for R1,250.50")).toMatchObject({ dueDate: "2026-11-16", amountMinor: 125050, currency: "ZAR" });
    // 23:30 UTC on 13 Nov is already 14 Nov in Johannesburg.
    expect(parseCapture("Do it today", { now: new Date("2026-11-13T23:30:00Z"), timezone: TZ }).dueDate).toBe("2026-11-14");
  });
  it("reads day/month/year as day first", () => {
    expect(parse("Pay 05/12/2026").dueDate).toBe("2026-12-05");
  });
  it("does not read the verb 'may' as a month", () => {
    expect(extractDate("I may pay later", today, { recurring: false })).toEqual({ kind: "none" });
  });
  it("leaves the date missing when none is given and says so", () => {
    const p = parse("Remember to sort out the garage");
    expect(p.dueDate).toBeUndefined();
    expect(p.title).toBe("Sort out the garage");
    expect(reviewNotes(p).dueDate).toMatch(/No date was found/);
  });
  it("a repeating item with no first date stays undated", () => {
    const p = parse("Gym R350 monthly");
    expect(p.dueDate).toBeUndefined();
    expect(p.recurrence).toEqual({ frequency: "monthly", interval: 1 });
    expect(reviewNotes(p).dueDate).toMatch(/first due date/);
  });
});

describe("amounts and currency", () => {
  it("needs a currency marker", () => {
    expect(extractAmounts("pay 899 next week")).toEqual([]);
    expect(extractAmounts("the 25th, 3 weeks, room 12")).toEqual([]);
  });
  it("reads South African and other formats", () => {
    expect(extractAmounts("R899")).toMatchObject([{ amountMinor: 89900, currency: "ZAR" }]);
    expect(extractAmounts("R 1 250.50")).toMatchObject([{ amountMinor: 125050, currency: "ZAR" }]);
    expect(extractAmounts("899 rand")).toMatchObject([{ amountMinor: 89900, currency: "ZAR" }]);
    expect(extractAmounts("EUR 12,50")).toMatchObject([{ currency: "EUR" }]);
    expect(extractAmounts("£20")).toMatchObject([{ amountMinor: 2000, currency: "GBP" }]);
  });
  it("flags an assumed dollar and multiple amounts", () => {
    expect(reviewNotes(parse("Pay $50 for the course on 20 December 2026")).currency).toMatch(/USD/);
    const p = parse("Pay R100 deposit and R900 balance on 20 December 2026");
    expect(p.amountMinor).toBe(10000);
    expect(reviewNotes(p).amountMinor).toMatch(/Several amounts/);
  });
  it("never produces an amount without a currency (schema)", () => {
    expect(commitmentProposalSchema.safeParse({ ...parse("x R5 on 1 December 2026"), currency: undefined }).success).toBe(false);
  });
});

describe("recurrence", () => {
  it.each([
    ["every day", { frequency: "daily", interval: 1 }],
    ["fortnightly", { frequency: "weekly", interval: 2 }],
    ["every 3 months", { frequency: "quarterly", interval: 1 }],
    ["every 2 weeks", { frequency: "weekly", interval: 2 }],
    ["annually", { frequency: "yearly", interval: 1 }],
    ["R99 per month", { frequency: "monthly", interval: 1 }],
    ["every Monday", { frequency: "weekly", interval: 1, weekdays: [1] }],
    ["every six months", { frequency: "monthly", interval: 6 }],
  ])("reads '%s'", (text, expected) => {
    expect(extractRecurrence(text)).toEqual(expected);
  });
  it("reads nothing from text without a pattern", () => {
    expect(extractRecurrence("pay the bill on 5 December")).toBeUndefined();
  });
  it("'every Monday' proposes the next Monday and flags it", () => {
    const p = parse("Team standup every Monday");
    expect(p.dueDate).toBe("2026-11-16");
    expect(p.recurrence).toMatchObject({ frequency: "weekly", weekdays: [1] });
    expect(reviewNotes(p).dueDate).toMatch(/Confirm the first date/);
  });
});

describe("review step", () => {
  it("builds the editable draft, preserving day 31 and suggested reminders", () => {
    const { draft, notes } = proposalToReview(parse("Pay rent on the 31st every month, R7500"), { currency: "ZAR", reminderOffsetsDays: [3, 1] });
    expect(draft).toMatchObject({ title: "Pay rent", type: "bill", repeat: "monthly", dayOfMonth: 31, dueDate: "2026-11-30", amount: "7500", currency: "ZAR", reminderOffsetsDays: [3] });
    expect(notes.dueDate).toBeDefined();
  });
  it("saves the user's edits, not the parser's output, and keeps the 31st", () => {
    const { draft } = proposalToReview(parse("Pay rent on the 31st every month, R7500"), { currency: "ZAR", reminderOffsetsDays: [3, 1] });
    const edited = { ...draft, title: "Rent (flat 4)", amount: "7600" };
    const result = draftToCommitment(edited, { userId: "u", timezone: TZ, nowIso: "2026-11-13T08:00:00.000Z", newId: () => "id1", sourceType: "pasted_text" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({ title: "Rent (flat 4)", amountMinor: 760000, sourceType: "pasted_text", dueDate: "2026-11-30" });
      expect(result.value.recurrence).toMatchObject({ frequency: "monthly", dayOfMonth: 31, startDate: "2026-11-30" });
    }
  });
  it("cannot be saved without a due date", () => {
    const { draft } = proposalToReview(parse("Remember to sort out the garage"), { currency: "ZAR", reminderOffsetsDays: [3, 1] });
    expect(draft.dueDate).toBe("");
    expect(draftToCommitment(draft, { userId: "u", timezone: TZ, nowIso: "2026-11-13T08:00:00.000Z", newId: () => "x" }).ok).toBe(false);
  });
  it("reports repeat patterns the form cannot express instead of dropping them silently", () => {
    expect(repeatFromRule({ frequency: "daily", interval: 1 })).toBeUndefined();
    const { draft, notes } = proposalToReview(parse("Team standup every Monday"), { currency: "ZAR", reminderOffsetsDays: [3, 1] });
    expect(draft.repeat).toBe("none");
    expect(notes.recurrence).toMatch(/cannot be set in the form yet/);
  });
});

describe("proposal schema", () => {
  const valid = parse("Renew vehicle licence on 18 March 2027");
  it("accepts parser output and rejects malformed data", () => {
    expect(commitmentProposalSchema.safeParse(valid).success).toBe(true);
    expect(commitmentProposalSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse({ ...valid, dueDate: "2027-02-30" }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse({ ...valid, type: "banking" }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse({ ...valid, parser: "magic" }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse({ ...valid, recurrence: { frequency: "monthly", interval: 0 } }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse({ ...valid, amountMinor: -5, currency: "ZAR" }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse("not an object").success).toBe(false);
  });
  it("requires a missing due date to be listed for review", () => {
    expect(commitmentProposalSchema.safeParse({ ...valid, dueDate: undefined }).success).toBe(false);
    expect(commitmentProposalSchema.safeParse({ ...valid, dueDate: undefined, needsReview: ["dueDate: missing"] }).success).toBe(true);
  });
});

describe("parser properties", () => {
  it("always returns a schema-valid proposal, whatever the input", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (text) => {
        expect(commitmentProposalSchema.safeParse(parse(text)).success).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
  it("always returns a schema-valid proposal for date- and money-like text", () => {
    const word = fc.constantFrom("pay", "R899", "$5", "25th", "31st", "every month", "in 3 days", "March", "18 March 2027", "30 February", "monthly", "tomorrow", "for 3 weeks", "the", "bill", "renew", "licence", "€10", "every Monday", "2027-13-45", "99/99/2027");
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 8 }), (words) => {
        const p = parse(words.join(" "));
        expect(commitmentProposalSchema.safeParse(p).success).toBe(true);
        if (p.dueDate) expect(p.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }),
      { numRuns: 300 },
    );
  });
  it("never reports an amount when the text has no currency marker", () => {
    // Alphabet avoids r, z, u, s, e, g and the currency symbols so no marker can appear.
    const noMarker = fc.stringMatching(/^[abcdfhijklmnopqtvwxy0-9 ,.]{0,60}$/);
    fc.assert(
      fc.property(noMarker, (text) => {
        expect(parse(text).amountMinor).toBeUndefined();
      }),
      { numRuns: 300 },
    );
  });
  it("does not copy the original note into the saved details", () => {
    expect(parse("My fibre bill is R899 and is due on the 25th of every month.").description).toBeUndefined();
  });
  it("is deterministic and truncates very long input", () => {
    expect(parse("Pay R100 on 5 December 2026")).toEqual(parse("Pay R100 on 5 December 2026"));
    expect(parse("x".repeat(10_000)).sourceSummary?.length).toBeLessThanOrEqual(140);
  });
});
