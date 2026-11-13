# THE HAUNT architecture

## Current implementation (prototype)

```text
Browser
  └── Next.js App Router
       └── HauntApp (client application shell)
            ├── Dashboard / Archive / Clocktower / Crypt / Keeper's Room
            ├── CommitmentModal
            ├── CommitmentRow
            ├── deterministic text capture parser
            ├── date and money presentation helpers
            ├── localStorage adapter (prototype only)
            └── Web Audio API (original generated sound)
```

The current app is intentionally local-first for a fast, dependable demo. It does not yet have authentication or a backend. Never describe this prototype as multi-device or cloud-synchronised.

## Intended production architecture

```text
Next.js PWA
   │ HTTPS
   ▼
NestJS API ───────── PostgreSQL (Prisma)
   │                       │
   ├── Auth / ownership    ├── users
   ├── Commitments         ├── commitments
   ├── Capture             ├── reminder rules
   ├── Attachments         ├── occurrences
   └── Preferences         └── audit / delivery state
   │
   ├── Redis / BullMQ workers
   │      ├── recurrence materialisation
   │      ├── reminder dispatch
   │      └── extraction jobs
   │
   └── Extraction provider adapter
          ├── text extraction
          ├── OCR / document parsing
          └── structured LLM proposal
```

## Production design rules

1. The browser is not the source of truth for reminders. A backend worker owns scheduling and dispatch.
2. Store recurrence rules with an explicit user timezone. Generate calendar occurrences using timezone-aware logic, not fixed-millisecond arithmetic.
3. Make occurrence generation and reminder dispatch idempotent.
4. Keep extracted proposals separate from persisted commitments. The user confirms every proposed date, amount, currency and recurrence.
5. Track reminder states such as scheduled, attempted, delivered, failed and cancelled. Do not equate a successful queue operation with a delivered notification.
6. Enforce ownership in every read, update and delete operation.
7. Treat attachment parsing and LLM processing as external data-processing operations requiring validation, disclosure and consent.

## Migration path

1. Extract local storage access behind a repository interface.
2. Implement the NestJS API and Postgres schema.
3. Add authentication and per-user ownership.
4. Migrate the client to API-backed persistence with a deliberate export/import path.
5. Add the recurrence engine and background reminder worker.
6. Add one structured extraction provider, then file and voice input.
7. Add offline write queueing and conflict handling only after server sync semantics are defined.
