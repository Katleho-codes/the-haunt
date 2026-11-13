# Product status

## Implemented in the local prototype

- [x] Responsive cinematic application shell
- [x] Dashboard with active, overdue, due-today and upcoming groupings
- [x] Manual create / edit / delete / complete / restore flows
- [x] Recurrence metadata and recurring view
- [x] Amount and multi-currency display
- [x] Local storage persistence
- [x] Quick text capture with deterministic parsing and editable review
- [x] Ambient / interaction sound preferences
- [x] Reduced-motion preference
- [x] JSON data export
- [x] Kiro steering and feature spec scaffolding

## Not implemented yet

- [ ] Backend API and authentication
- [ ] PostgreSQL persistence and migrations
- [ ] Recurrence occurrence materialisation and timezone-safe scheduling
- [ ] Reminder worker / email / web push delivery
- [ ] LLM-based extraction with schema validation
- [ ] PDF/image OCR and file scanning
- [ ] Voice transcription
- [ ] PWA service worker / offline sync conflict handling
- [ ] Automated tests and CI
- [ ] Privacy policy, data deletion workflow and production hardening

## Known design constraints

- Do not make a reminder appear delivered unless a delivery provider confirms it.
- Do not silently trust extracted date/amount/recurrence data; require review and confirmation.
- Do not imply bank connectivity or payment processing.
- Do not send personal documents to an external model without disclosure and consent.

## Update 13 November 2026 (Prompt 2: domain and persistence)

Verified by commands that ran: `npm run typecheck` (pass), `npm run lint` (0 errors, 1 `<img>` warning), `npm test` (Vitest, 7 files, 60 tests pass, includes fast-check property tests), `npm run build` (pass).

Implemented and unit-tested:
- Zod commitment/settings schemas (`lib/domain/schema.ts`): date-only due dates, optional time, IANA timezone, integer minor-unit money with required currency, recurrence rule shape.
- Date-only helpers, timezone-aware "today", money helpers, per-currency sums, lifecycle, grouping, filter and sort (`lib/domain/`).
- Repository interface and a localStorage implementation with per-user keys, ownership checks, versioned storage, one-time migration from the prototype format (originals kept), corrupt-data backup (`lib/storage/`).
- Form draft to commitment conversion, fictional demo data module.

Implemented in the UI but NOT verified in a browser (no browser automation has run):
- App now reads and writes through the repository; due dates are date-only; amounts are minor units; the 7-day total is per currency; archive action; versioned export; delete-all; "Load fictional demo data"; status banners for empty, migrated and corrupt storage.
- The old seed data is no longer loaded automatically.

Still not implemented: recurrence occurrences (completing a recurring item does not create the next one), reminders, validated import, search filters beyond text, backend, PWA service worker, LLM extraction, known parser defects in `docs/IMPLEMENTATION-AUDIT.md` section 5.