# Product status

_Summary last revised 13 November 2026. The dated updates further down are a log; where they differ, this summary and the newest update win._

## Implemented in the local-first build (verified items are listed in the dated updates)

- [x] Responsive cinematic application shell; five rooms (Hall, Archive, Clocktower, Crypt, Keeper's Room)
- [x] Create / edit / delete / complete / restore / archive, with an Active and Archived list in The Archive
- [x] Validated domain model: date-only due dates, minor-unit money, per-currency totals
- [x] Recurrence engine with completion history and undo of the latest completion
- [x] Browser-local persistence behind a repository interface, with migration and corrupt-data backup
- [x] In-app reminders with a notification centre (snooze, dismiss, test reminder)
- [x] Quick text capture: rule-based reader (not AI), proposal schema, review step with CHECK THIS markers
- [x] House mood, motion and atmosphere settings, gated sound with separate toggles and a volume ceiling
- [x] JSON export of commitments, completion history, reminders and settings; delete-all that also removes backups
- [x] Automated tests (Vitest and fast-check) and a browser smoke test (Playwright core, Edge); no CI yet
- [x] MIT licence

## Not implemented yet

- [ ] Backend API, authentication and server-side ownership (planned after the core is finished or after submission)
- [ ] PostgreSQL persistence and migrations
- [ ] Reminders while the app is closed; email or web push delivery
- [ ] Data import
- [ ] LLM-based extraction; PDF/image OCR; voice transcription
- [ ] PWA service worker and offline shell
- [ ] Timezone and locale settings in the UI; monthly recurring-amount view; edit scopes for series; pause
- [ ] Continuous integration; security headers; privacy notes page; public deployment
- [ ] Multi-tab safe saving

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

## Update 13 November 2026 (fixes after the independent review)

Verified by commands that ran: typecheck (pass), lint (0 errors, 1 `<img>` warning), `npm test` (13 files, 181 tests pass), production build (pass), `npm run e2e` (30 browser steps in Edge, all pass), `node e2e/contrast.mjs` (664 text elements pass), `node e2e/screenshots.mjs` (no overflow, no targets under 24px).

Fixed: archived items now have a list and Restore (H-1); controls have accessible names, checked by a sweep over every view and dialog (H-2, L-2); MIT licence added (H-3); delete-all removes backups and prototype copies (M-1); export includes completion history and reminders (M-2); parser no longer reads weights as money and reports times it ignores (M-3, M-4); Ctrl+K search (L-1); trademark mark removed (L-4); greeting no longer claims it is evening (L-5); stale docs corrected (L-6). See section 9 of `docs/REVIEW-2026-11-13.md`.

How the fixes were checked: new unit tests and e2e steps were mutation-checked (the fix was removed and the checks were seen to fail) for the archived list, switch names, quick-capture label, weight handling, word-currency flag, time note, title cutting and delete-all backups. The reviewer has not re-reviewed.

Still open from the review: text size (M-5), timezone and locale settings (M-7), overdue series needing one click per period (M-8), multi-tab and failed-save handling (M-6), past-date warning (L-8), data import, security headers, public deployment.

## Update 14 November 2026 (sound system)

Verified by commands that ran: typecheck (pass), lint (0 errors, 1 `<img>` warning), `npm test` (pass, now including the audio tests), `npm run check:audio` (pass), production build (pass, runs the audio check first), `npm run e2e:sound` (13 steps in Edge, pass), `npm run e2e` (30 steps, pass), contrast audit (725 text elements, pass), Docker build (pass, runs the audio check).

Done: a sound for every kind of interaction in six groups; the owner can swap any sound by editing `lib/audio/sound-map.ts` and dropping a file in `public/audio/`, with a built-in fallback; a procedural wind and room tone that follows the house mood (replaced by the owner's loop if one is set); a Sound test panel; sound pauses when the tab is hidden; size and path checks before every build.

Not verified: how anything sounds. The agent cannot hear; the owner must listen and judge. No owner audio files are in the repository yet. Browsers other than Edge were not tested.

## Update 14 November 2026 (UI polish)

All six items in `docs/ui-polish-plan.md` are done and checked:
- The Clocktower shows the year on dates that are not in the current year.
- The dead filter icon is gone from the list search.
- Text has a floor of 11px mono and 12px body. This closes review item M-5.
- The "No additional details" placeholder is hidden.
- The Hall hero is shorter on phones, so the first item that needs attention is on the first screen.
- Each room has a decorative motif (`components/room-motif.tsx`).

The screenshot review also found and fixed an older layout bug. On phones and tablets, list rows ran past the edge of the list and the row menu was cut off. Long titles on touch screens were cut without an ellipsis.

How it was checked: unit tests and `npm run e2e` (34 steps, Microsoft Edge). New steps cover the motifs (room only, `aria-hidden`, no overlap at 390/768/1280 px, still under reduced motion), clipped rows and titles without an ellipsis, all confirmed to fail before their fix. Also `node e2e/text-size.mjs`, the contrast audit and screenshots reviewed by the agent at three widths. The owner has not yet reviewed the motifs.

Still open from the review: M-6, M-7, M-8, L-8, data import, security headers, public deployment.
