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
## Update 13 November 2026 (Prompt 3: recurrence)

Verified: `npm run typecheck`, `npm run lint` (0 errors, 1 warning), `npm test` (10 files, 98 tests, including fast-check properties), `npm run build`.

Implemented and unit-tested: calendar recurrence for daily, weekly (optionally by weekday), fortnightly, monthly, quarterly and yearly rules; documented month-end and leap-year policy; end dates; idempotent generation; completion history; undo of the latest completion; series edits that leave history untouched; DST-aware wall-time to instant conversion (gap moves forward, overlap uses the first instant).

Implemented in the UI, NOT verified in a browser: completing a recurring item advances it and records history; The Crypt lists completed occurrences; The Clocktower shows the next three dates.

Not implemented: edit scopes 'this occurrence' and 'this and future', pause, weekday picker, interval picker (the form offers the six fixed patterns), reminders.

## Update 13 November 2026 (Prompt 4: reminders, plus first browser verification)

Verified by commands that ran: typecheck (pass), lint (0 errors, 1 `<img>` warning), `npm test` (11 files, 120 tests pass), production build (pass), and `npm run e2e`: 15 browser steps in Microsoft Edge against a production build with a controlled clock, all passing.

The browser run also verified earlier UI work for the first time: demo data on request, persistence across reload, completing a recurring item, history in The Crypt, undo, Clocktower next dates, row-menu hover layering, no horizontal scroll at 390px on the five views, sound off by default, delete-all, and no console errors.

Reminders (in-app only): configurable time of day and default offsets in The Keeper's Room; reminders become due when their time arrives; a bell with a count; a notification centre with NEW/SEEN, snooze (1 hour or tomorrow), dismiss, open, and a clearly labelled test reminder. They only appear while THE HAUNT is open. There is no email, push, text-message or background delivery, and the UI says so.

Still not built: browser push, email, a provider-backed delivery state model, reminders for `dueTime`, sound on new reminders. The e2e script ran on one browser (Edge) at two viewport sizes; it is not an accessibility audit.

## Update 13 November 2026 (Prompt 5: intelligent capture, Phase A)

Verified by commands that ran: typecheck (pass), lint (0 errors, 1 `<img>` warning), `npm test` (11 files, 153 tests pass), production build (pass), `npm run e2e` (17 browser steps in Edge, all pass, including two capture steps).

Implemented: a validated proposal schema; a rule-based reader (clearly labelled "not AI" in the review step) with an injected clock; a review form with CHECK THIS markers and a list of notes; nothing is saved until the user confirms; the saved record carries the user's edits and source type `pasted_text`.

Audit defects fixed with regression tests: "for 3 weeks" no longer produces an amount; "the 31st every month" keeps day 31 (the first date is the last day of a short month, flagged); the old "the 25th" only worked with "monthly".

The reader does not invent dates: "expires in March" leaves the date empty and the form cannot be saved until one is chosen. It does work out some values (the next "25th", "tomorrow", an assumed year) and always flags them.

Not built: any LLM or other external extraction, consent screens, file/OCR/voice capture (specs 5.9 to 5.13). The reader handles short English notes only; it does not handle other languages, times of day, or multiple commitments in one note.

## Update 13 November 2026 (Prompt 6: cinematic experience)

Verified by commands that ran: typecheck (pass), lint (0 errors, 1 `<img>` warning), `npm test` (12 files, 166 tests pass), production build (pass), `npm run e2e` (23 browser steps in Edge, all pass), `node e2e/contrast.mjs` (677 text elements, all at or above WCAG AA ratios), `node e2e/screenshots.mjs` (3 widths x 5 views: no horizontal overflow, no targets under 24px).

Done: house mood (Calm / Watchful / Restless) with a text label and background shifts; motion setting that follows the device by default plus an in-app override; atmosphere intensity; separate ambience and interaction toggles, volume with a hard ceiling, audio created only after a user gesture and only when a toggle is on; completion dissolve with Undo; seal stamp on adding a reviewed capture; focus trap and focus return in the dialog; self-hosted fonts; contrast fixes (about 50 muted text colours raised); larger touch targets on small screens.

Bugs found by the new checks and fixed: a hydration mismatch in the prerendered page (the date was baked in at build time); text colours below 4.5:1 across the app; touch targets of 13 to 19px on mobile; the completion ghost row duplicating selectors.

Not done or not verified: red usage was not reviewed line by line against the steering (6.8); pendulum and crypt motifs (6.12); only Microsoft Edge was tested, no screen reader, no real device, no Safari or Firefox; whether the audio actually sounds right or is comfortably quiet was not heard by anyone (only gain values are tested); the contrast audit approximates gradients. Two e2e runs crashed with an uncaptured Node error and passed on every later rerun (6 runs); the cause is unknown.