# Commitment domain: design

## Types (`lib/domain/`)
```ts
type DateOnly = string;   // YYYY-MM-DD
type LocalTime = string;  // HH:mm
interface Commitment {
  id: string; userId: string; title: string; description?: string;
  type: CommitmentType; category?: string; status: "active" | "completed" | "archived";
  dueDate: DateOnly; dueTime?: LocalTime; timezone: string;
  amountMinor?: number; currency?: string;
  recurrence?: RecurrenceRule; seriesId?: string;
  sourceType: "manual" | "pasted_text" | "image" | "pdf" | "voice" | "imported";
  createdAt: string; updatedAt: string; completedAt?: string;
}
```
Runtime validation with Zod (`commitmentSchema`). Types are inferred from schemas.

## Modules
- `lib/domain/schema.ts`: Zod schemas and types.
- `lib/domain/dates.ts`: date-only parsing, `todayIn(tz)`, `compareDateOnly`, `diffDays`, formatting by locale.
- `lib/domain/money.ts`: `toMinor`, `fromMinor`, `formatMoney`, `sumByCurrency`.
- `lib/domain/commitments.ts`: pure lifecycle functions (`complete`, `restore`, `archive`, `groupForHall`, `search`, `filter`).
- `lib/storage/repository.ts`: `CommitmentRepository` interface; `local-storage-repository.ts` implementation with versioned envelope `{ version, userId, commitments }`.
- `lib/storage/migrate.ts`: v0 (current prototype shape: `dueAt`, float `amount`, `pending`) to v1.

## Migration rules
- `dueAt` ISO to `dueDate` using the browser timezone at migration time and `dueTime` left empty, recorded in the migration note.
- `amount` major units times 100, rounded, to `amountMinor`.
- `pending` to `active`; `payment` to `bill`; `personal` to `custom`.
- The original blob is kept under a backup key until the user confirms.

## Ownership
Local mode has one fixed `userId` (`local`). The interface still requires it so a server repository can replace it without changing callers.
