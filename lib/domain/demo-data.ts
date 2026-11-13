import { commitmentSchema, type Commitment } from "@/lib/domain/schema";

/** Fictional demo commitments (brief section 14). Loaded only when the user asks. */
export function buildDemoCommitments(userId: string, timezone: string, nowIso: string): Commitment[] {
  const base = { userId, timezone, status: "active" as const, sourceType: "manual" as const, createdAt: nowIso, updatedAt: nowIso };
  const items: Array<Partial<Commitment> & Pick<Commitment, "id" | "title" | "type" | "dueDate">> = [
    { id: "demo-fibre", title: "Fibre account", type: "bill", dueDate: "2026-11-25", amountMinor: 89900, currency: "ZAR", recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 25, startDate: "2026-11-25" }, reminderOffsetsDays: [3, 1] },
    { id: "demo-school", title: "School fees", type: "bill", dueDate: "2026-12-01", amountMinor: 185000, currency: "ZAR", recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 1, startDate: "2026-12-01" }, reminderOffsetsDays: [3, 1] },
    { id: "demo-licence", title: "Vehicle licence renewal", type: "renewal", dueDate: "2027-03-18", recurrence: { frequency: "yearly", interval: 1, startDate: "2027-03-18" }, reminderOffsetsDays: [14, 7, 1] },
    { id: "demo-streaming", title: "Streaming membership", type: "subscription", dueDate: "2026-11-28", amountMinor: 9900, currency: "ZAR", recurrence: { frequency: "monthly", interval: 1, dayOfMonth: 28, startDate: "2026-11-28" }, reminderOffsetsDays: [1] },
    { id: "demo-dentist", title: "Dentist appointment", type: "appointment", dueDate: "2026-11-20", reminderOffsetsDays: [1] },
    { id: "demo-car-service", title: "Service the car", type: "household", dueDate: "2026-11-30", reminderOffsetsDays: [7, 1] },
  ];
  return items.map((item) => commitmentSchema.parse({ reminderOffsetsDays: [], ...base, ...item }));
}
