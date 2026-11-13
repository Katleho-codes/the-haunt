import type { Commitment } from "@/lib/domain/schema";

export const NOW_ISO = "2026-11-13T08:00:00.000Z";

export function makeCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c-1",
    userId: "user-a",
    title: "Fibre account",
    type: "bill",
    status: "active",
    dueDate: "2026-11-25",
    timezone: "Africa/Johannesburg",
    amountMinor: 89900,
    currency: "ZAR",
    reminderOffsetsDays: [3, 1],
    sourceType: "manual",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

export class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
  get length(): number { return this.data.size; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
}
