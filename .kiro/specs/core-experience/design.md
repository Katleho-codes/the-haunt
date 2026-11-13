> **Superseded** by `product-foundation` and `commitment-domain` on 2026-11-13. Kept for history. Do not execute tasks from this file.

# Core experience — design

## Current design
The Next.js App Router entry point renders a client-side application shell. The shell owns view selection, browser-local commitment state, UI feedback and settings. Domain types live in `lib/types.ts`; date helpers live in `lib/date-utils.ts`; seed records and storage keys live in `lib/seed.ts`.

## Domain model
`Commitment` has an id, title, description, category, dueAt ISO timestamp, recurrence enum, optional amount, currency, reminder offsets, status, source, createdAt and optional completedAt.

## Persistence
The first iteration uses `localStorage` to support a frictionless demo. This is not multi-device persistence and must not be described as cloud storage. A later server iteration must introduce authenticated ownership, validated API requests, Postgres migrations and an explicit data migration/export strategy.

## Date and recurrence notes
Due dates are stored as ISO timestamps. The current prototype uses browser-local date/time inputs. Production recurrence must use a timezone-aware recurrence definition and idempotent occurrence generation; do not assume adding a fixed number of milliseconds is correct for local calendar recurrence.

## Future production boundary
The reminder scheduler must be a backend worker. The browser must not be the source of truth for reminders. A delivery attempt and a successful delivery are distinct states.
