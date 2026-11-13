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

## Scope decision (owner, 13 November 2026)

The submission build is **local-first**. The server side (NestJS API, PostgreSQL with Prisma, Redis and BullMQ, a background reminder worker, authentication) is built once the core product is finished, or after submission. Nothing in the demo, README or video may imply it exists before it does.

### Repository layout against brief section 8.3

The brief's layout is a target, and it allows keeping the current Next.js root if a monorepo move is too expensive. We keep the current layout for now.

| Brief target | Today | Plan |
|---|---|---|
| `apps/web` | `app/`, `components/` at the root | Stays. Move only if the API work needs it. |
| `apps/api` (NestJS) | none | Built after the core is finished or after submission. |
| `packages/domain` | `lib/domain`, `lib/recurrence`, `lib/reminders`, `lib/capture` | Already free of React and browser code, so it can be moved into a package without a rewrite. |
| `packages/contracts` | Zod schemas in `lib/domain/schema.ts` and `lib/capture/proposal.ts` | Split out when a second consumer (the API) exists. |
| `prisma/`, `docker-compose.yml` | none | With the API. |
| `docs/PRIVACY-NOTES.md`, `docs/RELEASE-CHECKLIST.md` | missing | Written under the `privacy-and-security` and `release-and-demo` specs. |
| `LICENSE` | missing | Needs the owner's licence choice. |

### Rules that keep the later server work cheap

- Components talk to storage only through `CommitmentRepository` (`lib/storage/repository.ts`). A server-backed repository replaces the local one without touching the UI.
- Domain code stays pure and framework-free.
- Every repository call already takes a `userId`.
- The brief's Must Have items that this build does not meet until the server exists: server-backed storage, a reminder path that works when the app is closed, and per-user accounts. They are listed in `docs/RELEASE-CHECKLIST.md` (to be created) as open items.

## Docker network layout (13 November 2026)

```text
browser --> [edge network] --> web container  (published port, the only entry point)
                                  |
                                  +--> [backend network, internal: true] --> api container (no published port, no internet)
```

- The API is never published. Only the web container's server-side code talks to it, at `http://api:4000`, with a shared secret in `API_TOKEN` (server-side only; never `NEXT_PUBLIC_*`).
- The browser must never call the API directly. Next.js route handlers or server components act as the backend-for-frontend, so the API can trust only that one caller and the web layer can add authentication, validation and rate limits in front of it.
- Today `apps/api` is a placeholder with no features and the web app makes no calls to it. The layout is built and tested first so the real NestJS API can drop in without changing exposure.
- Verified on Docker Desktop for Windows with `scripts/check-isolation.ps1` (16 checks: no published port, internal network, host cannot reach it, web can, token required, no internet or host access from the API, token absent from browser output, non-root). Not verified on a Linux host: there the host machine itself can usually still reach container addresses on a bridge network, so "hidden" means hidden from your LAN and the internet, not from root on the host.
